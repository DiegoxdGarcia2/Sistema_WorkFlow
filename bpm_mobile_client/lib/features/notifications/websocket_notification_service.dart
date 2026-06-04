import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../core/models/tramite_model.dart';
import '../../core/network/network_provider.dart';
import '../../core/navigation/navigation_service.dart';
import '../sync/sync_worker.dart';
import '../tramites/tramite_tracking_screen.dart';
import 'notification_overlay_service.dart';

class NotificationItem {
  final String id;
  final String title;
  final String message;
  final String type;
  final DateTime timestamp;
  final bool isRead;

  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
    this.isRead = false,
  });

  NotificationItem copyWith({
    String? id,
    String? title,
    String? message,
    String? type,
    DateTime? timestamp,
    bool? isRead,
  }) {
    return NotificationItem(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      timestamp: timestamp ?? this.timestamp,
      isRead: isRead ?? this.isRead,
    );
  }
}

class NotificationListNotifier extends Notifier<List<NotificationItem>> {
  @override
  List<NotificationItem> build() => [];

  void addNotification(NotificationItem item) {
    state = [item, ...state].take(8).toList(); // Keep last 8 notifications
  }

  void markAsRead(String id) {
    state = state.map((item) {
      if (item.id == id) {
        return item.copyWith(isRead: true);
      }
      return item;
    }).toList();
  }

  void clear() {
    state = [];
  }
}

final notificationListProvider = NotifierProvider<NotificationListNotifier, List<NotificationItem>>(() {
  return NotificationListNotifier();
});

// Dynamic unread count computed from the list of notifications
final unreadNotificationsCountProvider = Provider<int>((ref) {
  final list = ref.watch(notificationListProvider);
  return list.where((item) => !item.isRead).length;
});

class WebsocketConnectionStatusNotifier extends Notifier<bool> {
  @override
  bool build() => false;
  void setStatus(bool status) => state = status;
}

final websocketConnectionStatusProvider = NotifierProvider<WebsocketConnectionStatusNotifier, bool>(() {
  return WebsocketConnectionStatusNotifier();
});

final websocketNotificationServiceProvider = Provider<WebsocketNotificationService>((ref) {
  final service = WebsocketNotificationService(ref);
  ref.onDispose(() {
    service.disconnect();
  });
  return service;
});

class WebsocketNotificationService {
  final Ref _ref;
  StompClient? _client;
  bool _isConnected = false;

  WebsocketNotificationService(this._ref);

  void connect() {
    final clienteId = _ref.read(clientIdProvider);
    final token = _ref.read(authTokenProvider);

    debugPrint('[WS-Notification] Intentando conectar. clienteId: $clienteId, token presente: ${token != null}');

    if (clienteId == null || clienteId.isEmpty) {
      debugPrint('[WS-Notification] Sin clienteId registrado. No se puede iniciar conexión.');
      return;
    }

    if (_isConnected) {
      debugPrint('[WS-Notification] Ya se encuentra conectado.');
      return;
    }

    // Clean up any old client configuration in a dead-state
    if (_client != null) {
      debugPrint('[WS-Notification] Limpiando cliente anterior antes de reconectar...');
      try {
        _client!.deactivate();
      } catch (_) {}
      _client = null;
    }

    // Configurar URL según la plataforma
    final String wsUrl = kIsWeb 
        ? 'ws://localhost:8080/ws-bpm' 
        : 'ws://10.0.2.2:8080/ws-bpm';

    debugPrint('[WS-Notification] Conectando a $wsUrl para cliente $clienteId...');

    _client = StompClient(
      config: StompConfig(
        url: wsUrl,
        onConnect: (StompFrame frame) => _onConnect(frame, clienteId),
        onWebSocketError: (dynamic error) {
          debugPrint('[WS-Notification] WebSocket Error: ${error.toString()}');
          _ref.read(websocketConnectionStatusProvider.notifier).setStatus(false);
        },
        onStompError: (StompFrame frame) {
          debugPrint('[WS-Notification] STOMP Error: ${frame.body}');
          _ref.read(websocketConnectionStatusProvider.notifier).setStatus(false);
        },
        onDisconnect: (StompFrame frame) {
          _isConnected = false;
          _ref.read(websocketConnectionStatusProvider.notifier).setStatus(false);
          debugPrint('[WS-Notification] Desconectado.');
        },
        stompConnectHeaders: token != null ? {'Authorization': 'Bearer $token'} : {},
        // Omitting webSocketConnectHeaders as it is unsupported on Web and causes handshake errors
      ),
    );

    _client!.activate();
  }

  void _onConnect(StompFrame frame, String clienteId) {
    _isConnected = true;
    _ref.read(websocketConnectionStatusProvider.notifier).setStatus(true);
    final destination = '/topic/tramite/cliente/$clienteId';
    debugPrint('[WS-Notification] Conexión establecida. Suscribiendo a $destination...');

    _client!.subscribe(
      destination: destination,
      callback: (StompFrame frame) {
        if (frame.body != null) {
          debugPrint('[WS-Notification] Mensaje recibido: ${frame.body}');
          _handleMessage(frame.body!);
        }
      },
    );
  }

  Future<void> _handleMessage(String body) async {
    try {
      final data = json.decode(body);
      final String type = data['type'] ?? 'TRAMITE_ACTUALIZADO';
      final payload = data['payload'] as Map<String, dynamic>? ?? {};
      final String message = payload['mensaje'] ?? 'Tu trámite ha cambiado de estado.';

      String title;
      switch (type.toUpperCase()) {
        case 'TRAMITE_INICIADO':
          title = 'Nuevo Trámite Iniciado';
          break;
        case 'TRAMITE_EN_PROGRESO':
          title = 'Trámite en Progreso';
          break;
        case 'TRAMITE_PASO_ACTUALIZADO':
          title = 'Trámite Avanzado';
          break;
        case 'TRAMITE_COMPLETADO':
          title = '¡Trámite Completado!';
          break;
        case 'TRAMITE_CANCELADO':
          title = 'Trámite Cancelado';
          break;
        default:
          title = 'Actualización de Trámite';
      }

      // Guardar la notificación en el estado local de Riverpod
      final notificationItem = NotificationItem(
        id: payload['tramiteId'] ?? DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
        message: message,
        type: type,
        timestamp: DateTime.now(),
        isRead: false,
      );
      _ref.read(notificationListProvider.notifier).addNotification(notificationItem);

      // Mostrar el banner usando el navigatorKey global
      NotificationOverlayService.showNotification(
        title: title,
        message: message,
        type: type,
        onTap: () {
          try {
            // Mark as read immediately when tapped from banner
            _ref.read(notificationListProvider.notifier).markAsRead(notificationItem.id);

            final box = Hive.box<TramiteModel>('tramites_box');
            final targetTramiteId = payload['tramiteId'];
            final tramite = box.values.firstWhere(
              (t) => t.codigoSeguimiento == targetTramiteId || t.offlineId == targetTramiteId || t.id == targetTramiteId,
              orElse: () => TramiteModel(
                id: targetTramiteId ?? '',
                politicaId: 'Instalación de Medidor Eléctrico',
                tenantId: '',
                clienteId: '',
                documentoCliente: '',
                clienteNombre: '',
                offlineId: '',
                usuarioId: '',
                estado: 'EN_PROGRESO',
                syncStatus: 'SYNCED',
              ),
            );
            navigatorKey.currentState?.push(
              MaterialPageRoute(
                builder: (context) => TramiteTrackingScreen(tramite: tramite),
              ),
            );
          } catch (e) {
            debugPrint('[WS-Notification] Error al navegar al tramite desde notificacion: $e');
          }
        },
      );

      // Auto-actualizar la lista de trámites localmente
      await _ref.read(syncWorkerProvider).pullTramites();

      // Force invalidate the tracking provider for this tramite to trigger reload
      try {
        final box = Hive.box<TramiteModel>('tramites_box');
        final targetTramiteId = payload['tramiteId'];
        final tramite = box.values.firstWhere(
          (t) => t.codigoSeguimiento == targetTramiteId || t.offlineId == targetTramiteId || t.id == targetTramiteId,
          orElse: () => TramiteModel(
            id: targetTramiteId ?? '',
            politicaId: 'Instalación de Medidor Eléctrico',
            tenantId: '',
            clienteId: '',
            documentoCliente: '',
            clienteNombre: '',
            offlineId: '',
            usuarioId: '',
            estado: 'EN_PROGRESO',
            syncStatus: 'SYNCED',
          ),
        );
        _ref.invalidate(trackingProvider(tramite));
      } catch (e) {
        debugPrint('[WS-Notification] Error al invalidar trackingProvider: $e');
      }

    } catch (e) {
      debugPrint('[WS-Notification] Error al procesar mensaje: $e');
    }
  }

  void disconnect() {
    if (_client != null) {
      debugPrint('[WS-Notification] Desconectando WebSocket...');
      try {
        _client!.deactivate();
      } catch (_) {}
      _client = null;
      _isConnected = false;
      _ref.read(websocketConnectionStatusProvider.notifier).setStatus(false);
    }
  }
}

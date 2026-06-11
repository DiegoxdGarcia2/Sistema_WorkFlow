import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../core/network/network_provider.dart';
import 'websocket_notification_service.dart';
import 'notification_overlay_service.dart';
import '../../core/models/tramite_model.dart';
import '../../core/navigation/navigation_service.dart';
import '../tramites/tramite_tracking_screen.dart';
import '../tramites/prerequisitos_screen.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Inicializar Firebase para procesos en background
  await Firebase.initializeApp();
  debugPrint('[FCM-Background] Notificación en background recibida: ${message.messageId}');
}

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref);
});

class FcmService {
  final Ref _ref;
  bool _isInitialized = false;

  FcmService(this._ref);

  Future<void> init() async {
    if (_isInitialized) return;

    try {
      // 1. Configurar manejador en segundo plano
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 2. Solicitar permisos de notificación (Android 13+ y iOS)
      final messaging = FirebaseMessaging.instance;
      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      debugPrint('[FCM] Estado de permisos obtenido: ${settings.authorizationStatus}');

      // 3. Escuchar notificaciones en primer plano (Foreground)
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM-Foreground] Mensaje recibido: ${message.notification?.title}');
        final isWsConnected = _ref.read(websocketConnectionStatusProvider);
        if (isWsConnected) {
          debugPrint('[FCM-Foreground] WebSocket está conectado. Omitiendo notificación duplicada en primer plano.');
          return;
        }
        _handleMessage(message);
      });

      // 4. Escuchar apertura de app por clic en notificación
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[FCM-OpenedApp] Click en notificación en background.');
        _navigateToTramite(message);
      });

      // Verificar si la app arrancó debido a clic en notificación (estando apagada)
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('[FCM-InitialMessage] App abierta desde notificación.');
        _navigateToTramite(initialMessage);
      }

      _isInitialized = true;
      debugPrint('[FCM] Inicializado correctamente.');

      // 5. Intentar registrar el token
      await registerTokenOnBackend();
    } catch (e, s) {
      debugPrint('[FCM] Falló inicialización: $e\n$s');
    }
  }

  Future<void> registerTokenOnBackend() async {
    final token = _ref.read(authTokenProvider);
    
    // Extraer userId desde JWT o Hive auth_box
    String? realUserId;
    try {
      final box = Hive.box('auth_box');
      final jwtToken = box.get('token') as String?;
      if (jwtToken != null && jwtToken.isNotEmpty) {
        final parts = jwtToken.split('.');
        if (parts.length == 3) {
          final payload = parts[1];
          final normalized = base64Url.normalize(payload);
          final decoded = utf8.decode(base64Url.decode(normalized));
          final Map<String, dynamic> claims = json.decode(decoded);
          realUserId = claims['id'] as String?;
        }
      }
    } catch (_) {}

    debugPrint('[FCM] Registro de token. userId: $realUserId, token presente: ${token != null}');

    if (realUserId == null || token == null) {
      debugPrint('[FCM] Usuario no autenticado. Omitiendo registro de token.');
      return;
    }

    try {
      final fcmToken = await FirebaseMessaging.instance.getToken();
      if (fcmToken == null) {
        debugPrint('[FCM] Token obtenido es nulo.');
        return;
      }

      debugPrint('[FCM] Token FCM del dispositivo: $fcmToken');

      final dio = _ref.read(dioProvider);
      // Llamar endpoint PUT /api/usuarios/{id}/fcm-token
      await dio.put('/usuarios/$realUserId/fcm-token', data: {'token': fcmToken});
      debugPrint('[FCM] Token FCM registrado exitosamente en el backend.');
    } catch (e) {
      debugPrint('[FCM] Error enviando token al backend: $e');
    }
  }

  void _handleMessage(RemoteMessage message) {
    try {
      final String title = message.notification?.title ?? 'Actualización de Trámite';
      final String body = message.notification?.body ?? 'Tu trámite ha cambiado de estado.';
      final data = message.data;

      final String type = data['type'] ?? 'TRAMITE_ACTUALIZADO';
      final String tramiteId = data['tramiteId'] ?? '';

      // Agregar item a listado local
      final notificationItem = NotificationItem(
        id: tramiteId.isNotEmpty ? tramiteId : DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
        message: body,
        type: type,
        timestamp: DateTime.now(),
        isRead: false,
      );
      _ref.read(notificationListProvider.notifier).addNotification(notificationItem);

      // Mostrar banner flotante en la UI
      NotificationOverlayService.showNotification(
        title: title,
        message: body,
        type: type,
        onTap: () => _navigateToTramite(message),
      );
    } catch (e) {
      debugPrint('[FCM] Error procesando mensaje foreground: $e');
    }
  }

  void _navigateToTramite(RemoteMessage message) {
    try {
      final data = message.data;
      final String targetTramiteId = data['tramiteId'] ?? '';
      if (targetTramiteId.isEmpty) return;
      final String type = data['type'] ?? '';

      final box = Hive.box<TramiteModel>('tramites_box');
      final tramite = box.values.firstWhere(
        (t) => t.codigoSeguimiento == targetTramiteId || t.offlineId == targetTramiteId || t.id == targetTramiteId,
        orElse: () => TramiteModel(
          id: targetTramiteId,
          politicaId: 'Trámite Registrado',
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

      if (type.toUpperCase() == 'PREREQUISITOS_REQUERIDOS' || type.toUpperCase() == 'DOCUMENTO_REQUERIDO_PASO') {
        navigatorKey.currentState?.push(
          MaterialPageRoute(
            builder: (context) => PrerequisitosScreen(
              tramiteId: targetTramiteId.isNotEmpty ? targetTramiteId : (tramite.id ?? ''),
              tramiteCodigo: tramite.codigoSeguimiento,
            ),
          ),
        );
      } else {
        navigatorKey.currentState?.push(
          MaterialPageRoute(
            builder: (context) => TramiteTrackingScreen(tramite: tramite),
          ),
        );
      }
    } catch (e) {
      debugPrint('[FCM] Error al navegar al trámite: $e');
    }
  }
}

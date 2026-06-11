import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../core/models/tramite_model.dart';
import '../../core/models/sync_request_dto.dart';
import '../../core/network/network_provider.dart';

final syncWorkerProvider = Provider<SyncWorker>((ref) {
  final dio = ref.read(dioProvider);
  return SyncWorker(dio);
});

class SyncWorker {
  final Dio dio;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _isSyncing = false;
  bool _isPulling = false;

  SyncWorker(this.dio);

  void startListening() {
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.contains(ConnectivityResult.wifi) || results.contains(ConnectivityResult.mobile);
      if (isOnline) {
        if (kDebugMode) {
          print('✅ Red detectada. Intentando sincronización masiva...');
        }
        pushPendingTramites();
      }
    });
  }

  void stopListening() {
    _connectivitySubscription?.cancel();
  }

  Future<void> pushPendingTramites() async {
    if (_isSyncing) return;

    final box = Hive.box<TramiteModel>('tramites_box');
    final pendingTramites = box.values.where((t) => t.syncStatus == 'PENDING').toList();

    if (pendingTramites.isEmpty) {
      if (kDebugMode) print('No hay trámites pendientes de sincronización.');
      return;
    }

    _isSyncing = true;
    int consecutiveFailures = 0;

    try {
      // Iterar sobre los trámites pendientes y publicarlos al endpoint configurado en la Fase 2
      for (final tramite in pendingTramites) {
        bool synced = false;

        while (!synced && consecutiveFailures < 3) {
          try {
            final dto = SyncRequestDTO(
              politicaId: tramite.politicaId,
              usuarioId: tramite.usuarioId,
              clienteId: tramite.clienteId,
              documentoCliente: tramite.documentoCliente,
              clienteNombre: tramite.clienteNombre,
              offlineId: tramite.offlineId,
            ).toJson();

            // Encolamiento asíncrono hacia Spring Boot -> Redis Broker
            final response = await dio.post('/tramites/sync', data: dto);

            if (response.statusCode == 202 || response.statusCode == 200) {
              // Si el servidor encoló exitosamente, marcamos el trámite local como subido a la nube.
              tramite.syncStatus = 'SYNCED';
              await tramite.save();
              if (kDebugMode) {
                print('☁️ Sincronizado trámite con éxito: ${tramite.offlineId}');
              }
              synced = true;
              consecutiveFailures = 0; // Reiniciar fallos consecutivos al tener éxito
            } else {
              throw DioException(
                requestOptions: response.requestOptions,
                response: response,
                type: DioExceptionType.badResponse,
              );
            }
          } on DioException catch (e) {
            final isNetworkOrServer = _isNetworkOrServerError(e);

            if (isNetworkOrServer) {
              consecutiveFailures++;
              if (kDebugMode) {
                print('⚠️ Fallo de red detectado al sincronizar trámite ${tramite.offlineId}. Fallos consecutivos: $consecutiveFailures/3');
              }

              if (consecutiveFailures >= 3) {
                if (kDebugMode) {
                  print('❌ Se alcanzaron 3 fallos de red consecutivos. Deteniendo sincronización masiva. Trámites pendientes quedan como PENDING.');
                }
                break; // Detener la sincronización del lote completo
              }

              final delaySeconds = 2 * (1 << (consecutiveFailures - 1));
              if (kDebugMode) {
                print('⏳ Esperando $delaySeconds segundos antes del próximo intento (back-off exponencial)...');
              }
              await Future.delayed(Duration(seconds: delaySeconds));
            } else {
              // Error de cliente (ej. 400 Bad Request) - no reintentamos
              if (kDebugMode) {
                print('❌ Error de validación/cliente (${e.response?.statusCode}) en trámite ${tramite.offlineId}. Se omite de este lote. Error: ${e.message}');
              }
              synced = true; // Salir del bucle para este trámite en particular
            }
          } catch (e) {
            if (kDebugMode) {
              print('❌ Error inesperado al sincronizar trámite ${tramite.offlineId}: $e');
            }
            synced = true; // Salir del bucle para este trámite en particular
          }
        }

        // Si alcanzamos el límite de fallos consecutivos de red, rompemos el bucle exterior también
        if (consecutiveFailures >= 3) {
          break;
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  bool _isNetworkOrServerError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.unknown) {
      return true;
    }
    if (e.type == DioExceptionType.badResponse) {
      final status = e.response?.statusCode;
      if (status != null && status >= 500) {
        return true;
      }
    }
    return false;
  }

  Future<void> pullTramites() async {
    if (_isPulling) return;
    _isPulling = true;

    try {
      final response = await dio.get('/tramites/mis-tramites');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        final box = Hive.box<TramiteModel>('tramites_box');
        
        // Preserve pending offline tramites
        final pendingTramites = box.values.where((t) => t.syncStatus == 'PENDING').toList();
        await box.clear();
        
        for (final pending in pendingTramites) {
          await box.add(pending);
        }

        final Set<String> processedIds = {};

        for (final item in data) {
          final t = item['tramite'];
          if (t == null) continue;

          final String id = t['id'] ?? '';
          if (id.isEmpty || processedIds.contains(id)) {
            continue;
          }
          processedIds.add(id);

          final model = TramiteModel(
            politicaId: t['politicaNombre'] ?? t['politicaId'] ?? 'Desconocido',
            usuarioId: t['clienteId'] ?? '',
            clienteId: t['clienteId'] ?? '',
            tenantId: t['tenantId'] ?? '',
            documentoCliente: t['documentoCliente'] ?? '',
            clienteNombre: t['clienteNombre'] ?? '',
            offlineId: id,
          )
            ..estado = t['estado'] ?? 'DESCONOCIDO'
            ..codigoSeguimiento = id
            ..syncStatus = 'SYNCED'
            ..iniciadoEn = t['iniciadoEn'] != null ? DateTime.parse(t['iniciadoEn']) : DateTime.now()
            ..finalizadoEn = t['finalizadoEn'] != null ? DateTime.parse(t['finalizadoEn']) : null;
            
          await box.add(model);
        }
        
        if (kDebugMode) {
          print('📥 Trámites descargados de la nube con éxito. Total: ${processedIds.length}');
        }
      }
    } on DioException catch (e) {
      if (kDebugMode) {
        print('❌ Error al descargar trámites: ${e.message}');
      }
    } finally {
      _isPulling = false;
    }
  }
}

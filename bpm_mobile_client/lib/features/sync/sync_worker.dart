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
    try {
      // Iterar sobre los trámites pendientes y publicarlos al endpoint configurado en la Fase 2
      for (final tramite in pendingTramites) {
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
        }
      }
    } on DioException catch (e) {
      // En caso de caída de servidor o error 500, capturamos el fallo.
      // El estado del trámite en Hive seguirá siendo "PENDING", preservando la data localmente
      // y se reintentará automáticamente en la próxima reconexión.
      if (kDebugMode) {
        print('❌ Fallo al sincronizar lote (se preserva PENDING). Error: ${e.message}');
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> pullTramites() async {
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

        for (final item in data) {
          final t = item['tramite'];
          if (t == null) continue;

          final model = TramiteModel(
            politicaId: t['politicaNombre'] ?? t['politicaId'] ?? 'Desconocido',
            usuarioId: t['clienteId'] ?? '',
            clienteId: t['clienteId'] ?? '',
            tenantId: t['tenantId'] ?? '',
            documentoCliente: t['documentoCliente'] ?? '',
            clienteNombre: t['clienteNombre'] ?? '',
            offlineId: t['id'] ?? '',
          )
            ..estado = t['estado'] ?? 'DESCONOCIDO'
            ..codigoSeguimiento = t['id']
            ..syncStatus = 'SYNCED'
            ..iniciadoEn = t['iniciadoEn'] != null ? DateTime.parse(t['iniciadoEn']) : DateTime.now()
            ..finalizadoEn = t['finalizadoEn'] != null ? DateTime.parse(t['finalizadoEn']) : null;
            
          await box.add(model);
        }
        
        if (kDebugMode) {
          print('📥 Trámites descargados de la nube con éxito.');
        }
      }
    } on DioException catch (e) {
      if (kDebugMode) {
        print('❌ Error al descargar trámites: ${e.message}');
      }
    }
  }
}

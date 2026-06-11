import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeline_tile/timeline_tile.dart';
import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../core/models/tramite_model.dart';
import '../../core/network/network_provider.dart';

class TrackingNode {
  final String title;
  final String description;
  final String? departamento;
  final String? ejecutadoPor;
  final String? notas;
  final DateTime? asignadoEn;
  final DateTime? completadoEn;
  final String estado; // PENDIENTE, EN_PROGRESO, COMPLETADA, etc.
  final bool isVirtualStart;
  final bool isVirtualEnd;
  final bool isTramiteFinalizado;

  TrackingNode({
    required this.title,
    required this.description,
    this.departamento,
    this.ejecutadoPor,
    this.notas,
    this.asignadoEn,
    this.completadoEn,
    this.estado = 'PENDIENTE',
    this.isVirtualStart = false,
    this.isVirtualEnd = false,
    this.isTramiteFinalizado = false,
  });

  PasoStatus get status {
    final e = estado.toUpperCase();
    if (e == 'COMPLETADA' || e == 'COMPLETADO' || e == 'APROBADA' || e == 'HECHO') {
      return PasoStatus.completado;
    }
    if (e == 'RECHAZADA' || e == 'RECHAZADO' || e == 'CANCELADA' || e == 'CANCELADO') {
      return PasoStatus.rechazado;
    }
    if (isTramiteFinalizado) {
      return PasoStatus.pendiente;
    }
    if (e == 'EN_PROGRESO' || e == 'ASIGNADA' || e == 'PENDIENTE_REVISION' || e == 'INICIADO' || (e == 'PENDIENTE' && !isVirtualEnd)) {
      return PasoStatus.activo;
    }
    return PasoStatus.pendiente;
  }
}

enum PasoStatus { completado, activo, pendiente, rechazado }

/// Provider that fetches real tracking data from the backend
final trackingProvider =
    FutureProvider.family<List<TrackingNode>, TramiteModel>((ref, tramite) async {
  final dio = ref.read(dioProvider);

  // If tramite is local-only (not synced), show offline node
  if (tramite.syncStatus == 'PENDING') {
    return [
      TrackingNode(
        title: 'Trámite Local',
        description: 'Guardado en tu dispositivo. Pendiente de sincronización.',
        estado: 'PENDIENTE',
        asignadoEn: tramite.iniciadoEn ?? DateTime.now(),
        isTramiteFinalizado: false,
      )
    ];
  }

  // The offlineId field stores the real tramite ID (e.g. "tramite-cre-60")
  final tramiteId = tramite.codigoSeguimiento ?? tramite.offlineId;

  final isFinalized = tramite.estado.toUpperCase() == 'COMPLETADO' || tramite.estado.toUpperCase() == 'FINALIZADO';
  final isCancelled = tramite.estado.toUpperCase() == 'CANCELADO';
  final isRejected = tramite.estado.toUpperCase() == 'RECHAZADO';
  final isFinished = isFinalized || isCancelled || isRejected;

  try {
    final response = await dio.get('/tramites/$tramiteId/tracking');

    if (response.statusCode == 200) {
      final data = response.data;
      final List<dynamic> timelineData = data['timeline'] ?? [];

      if (timelineData.isEmpty) {
        String endTitle = 'Fin del Trámite';
        String endDesc = 'El trámite finalizará una vez se completen todos los pasos.';
        String endEstado = 'PENDIENTE';

        if (isFinalized) {
          endTitle = 'Fin del Trámite';
          endDesc = 'El trámite ha finalizado de manera exitosa.';
          endEstado = 'COMPLETADO';
        } else if (isCancelled) {
          endTitle = 'Trámite Cancelado';
          endDesc = 'El trámite fue cancelado.';
          endEstado = 'RECHAZADO';
        } else if (isRejected) {
          endTitle = 'Trámite Rechazado';
          endDesc = 'El trámite fue rechazado.';
          endEstado = 'RECHAZADO';
        }

        return [
          TrackingNode(
            title: 'Inicio del Trámite',
            description: 'El trámite ha sido registrado e iniciado correctamente.',
            estado: 'COMPLETADO',
            asignadoEn: tramite.iniciadoEn,
            completadoEn: tramite.iniciadoEn,
            isVirtualStart: true,
            isTramiteFinalizado: isFinished,
          ),
          TrackingNode(
            title: endTitle,
            description: endDesc,
            estado: endEstado,
            completadoEn: (isFinalized || isCancelled || isRejected) ? (tramite.finalizadoEn ?? DateTime.now()) : null,
            isVirtualEnd: true,
            isTramiteFinalizado: isFinished,
          )
        ];
      }

      final List<TrackingNode> nodesList = [];

      // 1. Prepend virtual "Inicio del Trámite"
      nodesList.add(TrackingNode(
        title: 'Inicio del Trámite',
        description: 'El trámite ha sido registrado e iniciado correctamente.',
        estado: 'COMPLETADO',
        asignadoEn: tramite.iniciadoEn,
        completadoEn: tramite.iniciadoEn,
        isVirtualStart: true,
        isTramiteFinalizado: isFinished,
      ));

      // 2. Map backend workflow activities
      final mappedNodes = timelineData.map<TrackingNode>((paso) {
        DateTime? asignado;
        DateTime? completado;
        try {
          if (paso['asignadoEn'] != null) {
            asignado = DateTime.parse(paso['asignadoEn']);
          }
        } catch (_) {}
        try {
          if (paso['completadoEn'] != null) {
            completado = DateTime.parse(paso['completadoEn']);
          }
        } catch (_) {}

        return TrackingNode(
          title: paso['actividadNombre'] ?? 'Paso desconocido',
          description: paso['notas'] ?? _descriptionForEstado(paso['estado'] ?? ''),
          departamento: paso['calleNombre'],
          ejecutadoPor: paso['ejecutadoPor'],
          notas: paso['notas'],
          estado: paso['estado'] ?? 'PENDIENTE',
          asignadoEn: asignado,
          completadoEn: completado,
          isTramiteFinalizado: isFinished,
        );
      }).toList();

      nodesList.addAll(mappedNodes);

      // 3. Append virtual "Fin del Trámite"
      String endTitle = 'Fin del Trámite';
      String endDesc = 'El trámite finalizará una vez se completen todos los pasos.';
      String endEstado = 'PENDIENTE';

      if (isFinalized) {
        endTitle = 'Fin del Trámite';
        endDesc = 'El trámite ha finalizado de manera exitosa.';
        endEstado = 'COMPLETADO';
      } else if (isCancelled) {
        endTitle = 'Trámite Cancelado';
        endDesc = 'El trámite fue cancelado.';
        endEstado = 'RECHAZADO';
      } else if (isRejected) {
        endTitle = 'Trámite Rechazado';
        endDesc = 'El trámite fue rechazado.';
        endEstado = 'RECHAZADO';
      }

      nodesList.add(TrackingNode(
        title: endTitle,
        description: endDesc,
        estado: endEstado,
        completadoEn: (isFinalized || isCancelled || isRejected) ? (tramite.finalizadoEn ?? DateTime.now()) : null,
        isVirtualEnd: true,
        isTramiteFinalizado: isFinished,
      ));

      return nodesList;
    }
  } on DioException catch (e) {
    debugPrint('Error al cargar tracking: ${e.message}');
  }

  // Fallback: show basic info from local model
  String endTitleFallback = 'Fin del Trámite';
  String endDescFallback = isFinalized ? 'Trámite finalizado.' : 'Pendiente de finalización.';
  String endEstadoFallback = isFinalized ? 'COMPLETADO' : 'PENDIENTE';

  if (isCancelled) {
    endTitleFallback = 'Trámite Cancelado';
    endDescFallback = 'El trámite fue cancelado.';
    endEstadoFallback = 'RECHAZADO';
  } else if (isRejected) {
    endTitleFallback = 'Trámite Rechazado';
    endDescFallback = 'El trámite fue rechazado.';
    endEstadoFallback = 'RECHAZADO';
  }

  return [
    TrackingNode(
      title: 'Inicio del Trámite',
      description: 'Trámite iniciado.',
      estado: 'COMPLETADO',
      asignadoEn: tramite.iniciadoEn,
      completadoEn: tramite.iniciadoEn,
      isVirtualStart: true,
      isTramiteFinalizado: isFinished,
    ),
    TrackingNode(
      title: tramite.politicaId,
      description: 'Estado: ${tramite.estado}',
      estado: tramite.estado,
      asignadoEn: tramite.iniciadoEn,
      isTramiteFinalizado: isFinished,
    ),
    TrackingNode(
      title: endTitleFallback,
      description: endDescFallback,
      estado: endEstadoFallback,
      completadoEn: (isFinalized || isCancelled || isRejected) ? (tramite.finalizadoEn ?? DateTime.now()) : null,
      isVirtualEnd: true,
      isTramiteFinalizado: isFinished,
    )
  ];
});

String _descriptionForEstado(String estado) {
  switch (estado.toUpperCase()) {
    case 'COMPLETADA':
    case 'COMPLETADO':
    case 'APROBADA':
    case 'HECHO':
      return 'Paso completado exitosamente';
    case 'EN_PROGRESO':
      return 'En proceso de revisión';
    case 'ASIGNADA':
      return 'Asignado a un funcionario';
    case 'PENDIENTE':
    case 'SIN_ASIGNAR':
      return 'Pendiente de asignación';
    case 'PENDIENTE_REVISION':
      return 'Pendiente de revisión';
    case 'RECHAZADA':
    case 'RECHAZADO':
      return 'Este paso fue rechazado';
    default:
      return estado;
  }
}

class TramiteTrackingScreen extends ConsumerWidget {
  final TramiteModel tramite;

  const TramiteTrackingScreen({super.key, required this.tramite});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ValueListenableBuilder<Box<TramiteModel>>(
      valueListenable: Hive.box<TramiteModel>('tramites_box').listenable(),
      builder: (context, box, _) {
        final currentTramite = box.values.firstWhere(
          (t) => (tramite.id != null && tramite.id!.isNotEmpty && t.id == tramite.id) || 
                 (tramite.codigoSeguimiento != null && t.codigoSeguimiento == tramite.codigoSeguimiento) || 
                 (tramite.offlineId.isNotEmpty && t.offlineId == tramite.offlineId),
          orElse: () => tramite,
        );

        final trackingState = ref.watch(trackingProvider(currentTramite));

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFC),
          appBar: AppBar(
            flexibleSpace: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            title: const Text('Seguimiento del Trámite',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            iconTheme: const IconThemeData(color: Colors.white),
            elevation: 0,
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: Colors.white),
                onPressed: () => ref.invalidate(trackingProvider(currentTramite)),
              ),
            ],
          ),
          body: trackingState.when(
            loading: () => const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFF2563EB)),
                  SizedBox(height: 16),
                  Text('Cargando seguimiento...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            ),
            error: (err, stack) => Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 60, color: Colors.redAccent),
                  const SizedBox(height: 16),
                  Text('Error al cargar: $err',
                      style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(trackingProvider(currentTramite)),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            ),
            data: (nodes) {
              return Column(
                children: [
                  // Header card with tramite info
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.all(16),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          currentTramite.politicaId,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildStatusChip(currentTramite.estado),
                            const SizedBox(width: 8),
                            if (currentTramite.codigoSeguimiento != null)
                              Flexible(
                                child: Text(
                                  '#${currentTramite.codigoSeguimiento}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF94A3B8),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Timeline
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0),
                      child: ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        itemCount: nodes.length,
                        itemBuilder: (context, index) {
                          final node = nodes[index];
                          final isFirst = index == 0;
                          final isLast = index == nodes.length - 1;

                          return TimelineTile(
                            isFirst: isFirst,
                            isLast: isLast,
                            beforeLineStyle: LineStyle(
                              color: index > 0 && (nodes[index - 1].status == PasoStatus.completado)
                                  ? const Color(0xFF16A34A)
                                  : const Color(0xFFCBD5E1),
                              thickness: 3.5,
                            ),
                            afterLineStyle: LineStyle(
                              color: node.status == PasoStatus.completado
                                  ? const Color(0xFF16A34A)
                                  : const Color(0xFFCBD5E1),
                              thickness: 3.5,
                            ),
                            indicatorStyle: IndicatorStyle(
                              width: 38,
                              height: 38,
                              indicator: _buildIndicator(node),
                            ),
                            endChild: Padding(
                              padding: const EdgeInsets.only(left: 16.0, bottom: 12.0, top: 4.0),
                              child: _buildNodeCard(node),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildIndicator(TrackingNode node) {
    if (node.isVirtualStart) {
      return Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFFE8F5E9),
          border: Border.all(color: const Color(0xFF16A34A), width: 2.5),
        ),
        child: const Icon(
          Icons.play_arrow,
          color: Color(0xFF16A34A),
          size: 22,
        ),
      );
    }
    if (node.isVirtualEnd) {
      final isFinalized = node.status == PasoStatus.completado;
      return Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: isFinalized ? const Color(0xFFE8F5E9) : const Color(0xFFF1F5F9),
          border: Border.all(
            color: isFinalized ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
            width: 2.5,
          ),
        ),
        child: Icon(
          isFinalized ? Icons.emoji_events : Icons.flag_outlined,
          color: isFinalized ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
          size: 20,
        ),
      );
    }

    switch (node.status) {
      case PasoStatus.completado:
        return Container(
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFF16A34A),
          ),
          child: const Icon(
            Icons.check,
            color: Colors.white,
            size: 22,
          ),
        );
      case PasoStatus.rechazado:
        return Container(
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFFDC2626),
          ),
          child: const Icon(
            Icons.close,
            color: Colors.white,
            size: 22,
          ),
        );
      case PasoStatus.activo:
        return Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF2563EB),
            border: Border.all(
              color: const Color(0xFFBFDBFE),
              width: 3.5,
            ),
          ),
          child: const Center(
            child: SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            ),
          ),
        );
      case PasoStatus.pendiente:
        return Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            border: Border.all(
              color: const Color(0xFFCBD5E1),
              width: 2,
            ),
          ),
        );
    }
  }

  Widget _buildNodeCard(TrackingNode node) {
    Color bgColor;
    Border border;
    List<BoxShadow> shadow;
    Color titleColor;
    Color descColor;

    if (node.isVirtualStart) {
      bgColor = const Color(0xFFF0FDF4);
      border = Border.all(color: const Color(0xFFDCFCE7), width: 1);
      shadow = [
        BoxShadow(
          color: const Color(0xFF16A34A).withOpacity(0.04),
          blurRadius: 6,
          offset: const Offset(0, 2),
        ),
      ];
      titleColor = const Color(0xFF14532D);
      descColor = const Color(0xFF166534);
    } else if (node.isVirtualEnd) {
      final isFinalized = node.status == PasoStatus.completado;
      bgColor = isFinalized ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC);
      border = Border.all(
        color: isFinalized ? const Color(0xFFDCFCE7) : const Color(0xFFE2E8F0),
        width: 1,
      );
      shadow = [];
      titleColor = isFinalized ? const Color(0xFF14532D) : const Color(0xFF64748B);
      descColor = isFinalized ? const Color(0xFF166534) : const Color(0xFF94A3B8);
    } else {
      switch (node.status) {
        case PasoStatus.completado:
          bgColor = Colors.white;
          border = Border.all(color: const Color(0xFFE2E8F0), width: 1);
          shadow = [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ];
          titleColor = const Color(0xFF0F172A);
          descColor = const Color(0xFF334155);
          break;
        case PasoStatus.rechazado:
          bgColor = const Color(0xFFFEF2F2);
          border = Border.all(color: const Color(0xFFFEE2E2), width: 1);
          shadow = [];
          titleColor = const Color(0xFF7F1D1D);
          descColor = const Color(0xFF991B1B);
          break;
        case PasoStatus.activo:
          bgColor = const Color(0xFFF0F9FF);
          border = Border.all(color: const Color(0xFFBFDBFE), width: 1.5);
          shadow = [
            BoxShadow(
              color: const Color(0xFF2563EB).withOpacity(0.05),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ];
          titleColor = const Color(0xFF1E3A8A);
          descColor = const Color(0xFF1E293B);
          break;
        case PasoStatus.pendiente:
          bgColor = const Color(0xFFF8FAFC).withOpacity(0.8);
          border = Border.all(color: const Color(0xFFF1F5F9), width: 1);
          shadow = [];
          titleColor = const Color(0xFF94A3B8);
          descColor = const Color(0xFF94A3B8);
          break;
      }
    }

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: border,
        boxShadow: shadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  node.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: titleColor,
                  ),
                ),
              ),
              if (node.status == PasoStatus.completado && !node.isVirtualStart && !node.isVirtualEnd)
                const Icon(
                  Icons.check_circle,
                  color: Color(0xFF16A34A),
                  size: 18,
                ),
              if (node.status == PasoStatus.activo && !node.isVirtualStart && !node.isVirtualEnd)
                const Icon(
                  Icons.pending,
                  color: Color(0xFF2563EB),
                  size: 18,
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            node.description,
            style: TextStyle(
              fontSize: 13.5,
              color: descColor,
              height: 1.3,
            ),
          ),
          
          // Additional fields (departamento, etc.) if not virtual nodes
          if (!node.isVirtualStart && !node.isVirtualEnd) ...[
            if (node.departamento != null || node.ejecutadoPor != null)
              const SizedBox(height: 10),
            
            if (node.departamento != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4.0),
                child: Row(
                  children: [
                    Icon(Icons.business, size: 13, color: titleColor.withOpacity(0.5)),
                    const SizedBox(width: 6),
                    Text(
                      node.departamento!,
                      style: TextStyle(
                        fontSize: 12,
                        color: titleColor.withOpacity(0.7),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              
            if (node.ejecutadoPor != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 4.0),
                child: Row(
                  children: [
                    Icon(Icons.person, size: 13, color: titleColor.withOpacity(0.5)),
                    const SizedBox(width: 6),
                    Text(
                      node.ejecutadoPor!,
                      style: TextStyle(
                        fontSize: 12,
                        color: titleColor.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
          ],
          
          // Show completion/assignment dates
          if (node.completadoEn != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.check_circle_outline, size: 13, color: Color(0xFF16A34A)),
                const SizedBox(width: 6),
                Text(
                  node.isVirtualStart 
                      ? 'Iniciado: ${_formatDate(node.completadoEn!)}'
                      : node.isVirtualEnd
                          ? 'Finalizado: ${_formatDate(node.completadoEn!)}'
                          : 'Completado: ${_formatDate(node.completadoEn!)}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF16A34A),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ] else if (node.asignadoEn != null && node.status == PasoStatus.activo) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.access_time, size: 13, color: Color(0xFF2563EB)),
                const SizedBox(width: 6),
                Text(
                  'Asignado: ${_formatDate(node.asignadoEn!)}',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF2563EB),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],

          if (node.notas != null && node.notas!.isNotEmpty && !node.isVirtualStart && !node.isVirtualEnd) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: node.status == PasoStatus.activo 
                    ? const Color(0xFFEFF6FF) 
                    : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: node.status == PasoStatus.activo 
                      ? const Color(0xFFDBEAFE) 
                      : const Color(0xFFE2E8F0),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.notes, size: 13, color: titleColor.withOpacity(0.5)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      node.notas!,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: titleColor.withOpacity(0.8),
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusChip(String estado) {
    Color bgColor;
    Color textColor;
    String displayEstado = estado.toUpperCase().trim();
    if (displayEstado == 'INICIADO') {
      displayEstado = 'EN PROCESO';
    }

    switch (displayEstado) {
      case 'COMPLETADO':
      case 'FINALIZADO':
        bgColor = const Color(0xFFDCFCE7); // Light green
        textColor = const Color(0xFF15803D); // Dark green
        break;
      case 'EN_PROGRESO':
      case 'EN PROCESO':
        bgColor = const Color(0xFFFEF3C7); // Light orange/amber
        textColor = const Color(0xFFD97706); // Dark orange
        break;
      case 'CANCELADO':
      case 'RECHAZADO':
        bgColor = const Color(0xFFFEE2E2); // Light red
        textColor = const Color(0xFFDC2626); // Dark red
        break;
      default:
        bgColor = const Color(0xFFF1F5F9);
        textColor = const Color(0xFF64748B);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        displayEstado,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
    );
  }
}

String _formatDate(DateTime date) {
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
}

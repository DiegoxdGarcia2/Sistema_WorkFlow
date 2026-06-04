import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../../core/models/tramite_model.dart';
import '../../core/network/network_provider.dart';
import '../assistant/assistant_bottom_sheet.dart';
import '../sync/sync_worker.dart';
import 'tramite_tracking_screen.dart';
import '../auth/login_screen.dart';
import '../notifications/websocket_notification_service.dart';

class TramitesListScreen extends ConsumerWidget {
  const TramitesListScreen({super.key});

  void _handleLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cerrar Sesión'),
        content: const Text('¿Estás seguro que deseas cerrar tu sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.pop(context); // Close dialog
              
              // Clear token & client ID
              ref.read(authTokenProvider.notifier).setToken(null);
              ref.read(clientIdProvider.notifier).setClientId(null);
              
              // Clear local DB to avoid mixing data
              final box = Hive.box<TramiteModel>('tramites_box');
              await box.clear();

              try {
                final authBox = Hive.box('auth_box');
                await authBox.clear();
              } catch (_) {}

              // Redirect back to login screen and clear history
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text('Cerrar Sesión'),
          ),
        ],
      ),
    );
  }

  void _showProfile(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 40,
              backgroundColor: Color(0xFF0F172A),
              child: Icon(Icons.person, size: 40, color: Colors.white),
            ),
            const SizedBox(height: 16),
            const Text(
              'Mi Perfil',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            const Text('diegogarcia@cre-client.com', style: TextStyle(color: Colors.grey, fontSize: 16)),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.logout, color: Colors.redAccent),
                label: const Text('Cerrar Sesión', style: TextStyle(color: Colors.redAccent)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: Colors.redAccent),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () {
                  Navigator.pop(context); // close bottom sheet
                  _handleLogout(context, ref);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNotifications(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Consumer(
        builder: (context, ref, child) {
          final notifications = ref.watch(notificationListProvider);
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Notificaciones Recientes',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    if (notifications.isNotEmpty)
                      TextButton(
                        onPressed: () {
                          ref.read(notificationListProvider.notifier).clear();
                        },
                        child: const Text('Limpiar todo', style: TextStyle(color: Colors.redAccent)),
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                if (notifications.isEmpty)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      child: Column(
                        children: [
                          Icon(Icons.notifications_none_rounded, size: 60, color: Colors.grey.shade400),
                          const SizedBox(height: 12),
                          const Text(
                            'No tienes notificaciones recientes.',
                            style: TextStyle(color: Colors.grey, fontSize: 15),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      itemCount: notifications.length,
                      itemBuilder: (context, index) {
                        final notification = notifications[index];
                        final isUnread = !notification.isRead;
                        IconData icon;
                        Color iconColor;
                        switch (notification.type.toUpperCase()) {
                          case 'TRAMITE_COMPLETADO':
                            icon = Icons.check_circle_outline_rounded;
                            iconColor = Colors.green;
                            break;
                          case 'TRAMITE_CANCELADO':
                            icon = Icons.error_outline_rounded;
                            iconColor = Colors.red;
                            break;
                          default:
                            icon = Icons.info_outline_rounded;
                            iconColor = const Color(0xFF1E3A8A);
                        }

                        // Formatear hora
                        final timeStr = '${notification.timestamp.hour.toString().padLeft(2, '0')}:${notification.timestamp.minute.toString().padLeft(2, '0')}';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: isUnread ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isUnread ? const Color(0xFFBFDBFE) : const Color(0xFFE2E8F0)),
                          ),
                          child: Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: () {
                                // 1. Mark as read
                                ref.read(notificationListProvider.notifier).markAsRead(notification.id);

                                // 2. Close bottom sheet
                                Navigator.pop(context);

                                // 3. Navigate to tracking screen
                                try {
                                  final box = Hive.box<TramiteModel>('tramites_box');
                                  final targetTramiteId = notification.id;
                                  final tramite = box.values.firstWhere(
                                    (t) => t.codigoSeguimiento == targetTramiteId || t.offlineId == targetTramiteId || t.id == targetTramiteId,
                                    orElse: () => TramiteModel(
                                      id: targetTramiteId,
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
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => TramiteTrackingScreen(tramite: tramite),
                                    ),
                                  );
                                } catch (e) {
                                  debugPrint('[WS-Notification] Error al navegar al tramite desde campanita: $e');
                                }
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(icon, color: iconColor, size: 22),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Flexible(
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Flexible(
                                                      child: Text(
                                                        notification.title,
                                                        style: TextStyle(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 14,
                                                          color: isUnread ? const Color(0xFF1E3A8A) : const Color(0xFF0F172A),
                                                        ),
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ),
                                                    if (isUnread) ...[
                                                      const SizedBox(width: 6),
                                                      Container(
                                                        width: 6,
                                                        height: 6,
                                                        decoration: const BoxDecoration(
                                                          color: Colors.blueAccent,
                                                          shape: BoxShape.circle,
                                                        ),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                timeStr,
                                                style: TextStyle(
                                                  color: Colors.grey.shade500,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            notification.message,
                                            style: TextStyle(
                                              color: isUnread ? const Color(0xFF1E293B) : Colors.grey.shade700,
                                              fontSize: 13,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Proactive WebSocket connection check on screen build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(websocketNotificationServiceProvider).connect();
      ref.read(syncWorkerProvider).pullTramites();
    });

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFF1F5F9), // Un color Slate super claro y elegante
        appBar: AppBar(
          flexibleSpace: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)], // Dark Slate to Dark Blue
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          title: const Text('Mis Trámites', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.sync, color: Colors.white),
              tooltip: 'Sincronizar ahora',
              onPressed: () async {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Sincronizando trámites...'), duration: Duration(seconds: 2)),
                );
                await ref.read(syncWorkerProvider).pushPendingTramites();
                await ref.read(syncWorkerProvider).pullTramites();
              },
            ),
            Consumer(
              builder: (context, ref, child) {
                final isConnected = ref.watch(websocketConnectionStatusProvider);
                final unreadCount = ref.watch(unreadNotificationsCountProvider);
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Small connection status indicator dot
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: isConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444), // Emerald green or red
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: (isConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withOpacity(0.4),
                            blurRadius: 4,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 4),
                    Badge(
                      label: unreadCount > 0 ? Text(unreadCount.toString()) : null,
                      isLabelVisible: unreadCount > 0,
                      backgroundColor: Colors.redAccent,
                      alignment: const Alignment(0.6, -0.6),
                      child: IconButton(
                        icon: const Icon(Icons.notifications, color: Colors.white),
                        tooltip: isConnected ? 'Notificaciones (Conectado)' : 'Notificaciones (Desconectado)',
                        onPressed: () {
                          _showNotifications(context, ref);
                        },
                      ),
                    ),
                  ],
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.account_circle, color: Colors.white, size: 28),
              tooltip: 'Perfil',
              onPressed: () => _showProfile(context, ref),
            ),
            const SizedBox(width: 8),
          ],
          bottom: const TabBar(
            indicatorColor: Colors.white,
            indicatorWeight: 3,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            tabs: [
              Tab(text: 'En Proceso', icon: Icon(Icons.hourglass_top)),
              Tab(text: 'Historial', icon: Icon(Icons.history)),
            ],
          ),
        ),
        body: ValueListenableBuilder<Box<TramiteModel>>(
          valueListenable: Hive.box<TramiteModel>('tramites_box').listenable(),
          builder: (context, box, _) {
            if (box.values.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.folder_open_rounded, size: 80, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    const Text(
                      'No tienes trámites activos.',
                      style: TextStyle(color: Colors.grey, fontSize: 18, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Usa el Asistente para iniciar uno nuevo o pulsa Sync.',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ],
                ),
              );
            }

            final todosLosTramites = box.values.toList().cast<TramiteModel>();
            todosLosTramites.sort((a, b) {
              if (a.syncStatus == 'PENDING' && b.syncStatus == 'SYNCED') return -1;
              if (a.syncStatus == 'SYNCED' && b.syncStatus == 'PENDING') return 1;
              return (b.iniciadoEn ?? DateTime.now()).compareTo(a.iniciadoEn ?? DateTime.now());
            });

            final enProceso = todosLosTramites.where((t) {
              final est = t.estado.toUpperCase().trim();
              return est != 'FINALIZADO' && est != 'RECHAZADO' && est != 'COMPLETADO' && est != 'CANCELADO';
            }).toList();
            final historial = todosLosTramites.where((t) {
              final est = t.estado.toUpperCase().trim();
              return est == 'FINALIZADO' || est == 'RECHAZADO' || est == 'COMPLETADO' || est == 'CANCELADO';
            }).toList();

            return TabBarView(
              children: [
                _buildTramitesList(context, ref, enProceso, 'No tienes trámites en proceso.'),
                _buildTramitesList(context, ref, historial, 'No tienes trámites finalizados.'),
              ],
            );
          },
        ),
        floatingActionButton: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2563EB).withOpacity(0.3),
                blurRadius: 15,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: FloatingActionButton.extended(
            backgroundColor: const Color(0xFF2563EB), // Tailwind Blue 600
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            icon: const Icon(Icons.auto_awesome),
            label: const Text('Asistente IA', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (context) => const AssistantBottomSheet(),
              );
            },
          ),
        ),
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
        bgColor = const Color(0xFFFEF3C7); // Light orange/yellow
        textColor = const Color(0xFFD97706); // Dark orange/amber
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

  Widget _buildTramitesList(BuildContext context, WidgetRef ref, List<TramiteModel> tramites, String emptyMessage) {
    if (tramites.isEmpty) {
      return Center(
        child: Text(
          emptyMessage,
          style: const TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () async {
        await ref.read(syncWorkerProvider).pushPendingTramites();
        await ref.read(syncWorkerProvider).pullTramites();
      },
      color: const Color(0xFF1E3A8A),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        itemCount: tramites.length,
        itemBuilder: (context, index) {
          final tramite = tramites[index];
          final isPending = tramite.syncStatus == 'PENDING';

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(20),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => TramiteTrackingScreen(tramite: tramite),
                    ),
                  );
                },
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: isPending ? Colors.orange.shade50 : const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(
                          isPending ? Icons.cloud_off : Icons.task_alt_rounded,
                          color: isPending ? Colors.orange : const Color(0xFF2563EB),
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tramite.politicaId,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: Color(0xFF1E293B),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                _buildStatusChip(tramite.estado),
                                if (tramite.codigoSeguimiento != null) ...[
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      '#${tramite.codigoSeguimiento}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF94A3B8),
                                        fontWeight: FontWeight.w500,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 30),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}


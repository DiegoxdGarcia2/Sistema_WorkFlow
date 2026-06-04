import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/navigation/navigation_service.dart';

class NotificationOverlayService {
  static void showNotification({
    required String title,
    required String message,
    required String type,
    VoidCallback? onTap,
  }) {
    final overlay = navigatorKey.currentState?.overlay;
    if (overlay == null) {
      debugPrint('[NotificationOverlayService] No se encontró Overlay widget en el Navigator.');
      return;
    }
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => _SlidingNotificationBanner(
        title: title,
        message: message,
        type: type,
        onTap: onTap,
        onDismiss: () {
          try {
            overlayEntry.remove();
          } catch (_) {}
        },
      ),
    );

    overlay.insert(overlayEntry);
  }
}

class _SlidingNotificationBanner extends StatefulWidget {
  final String title;
  final String message;
  final String type;
  final VoidCallback? onTap;
  final VoidCallback onDismiss;

  const _SlidingNotificationBanner({
    required this.title,
    required this.message,
    required this.type,
    this.onTap,
    required this.onDismiss,
  });

  @override
  State<_SlidingNotificationBanner> createState() => _SlidingNotificationBannerState();
}

class _SlidingNotificationBannerState extends State<_SlidingNotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _offsetAnimation;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );

    _offsetAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.5),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    ));

    _controller.forward();

    // Auto-dismiss after 6 seconds
    _dismissTimer = Timer(const Duration(seconds: 6), _dismiss);
  }

  void _dismiss() {
    if (mounted) {
      _controller.reverse().then((_) {
        widget.onDismiss();
      });
    }
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final topPadding = mq.padding.top + 16.0;

    Color bgColor;
    IconData icon;
    switch (widget.type.toUpperCase()) {
      case 'TRAMITE_INICIADO':
      case 'TRAMITE_EN_PROGRESO':
      case 'TRAMITE_PASO_ACTUALIZADO':
        bgColor = const Color(0xFF1E3A8A); // Royal Blue
        icon = Icons.info_outline;
        break;
      case 'TRAMITE_COMPLETADO':
        bgColor = const Color(0xFF10B981); // Emerald Green
        icon = Icons.check_circle_outline;
        break;
      case 'TRAMITE_CANCELADO':
        bgColor = const Color(0xFFEF4444); // Crimson Red
        icon = Icons.error_outline;
        break;
      default:
        bgColor = const Color(0xFF1E293B); // Slate
        icon = Icons.notifications_none;
    }

    return Positioned(
      top: topPadding,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _offsetAnimation,
        child: SafeArea(
          top: false,
          child: Material(
            color: Colors.transparent,
            elevation: 10,
            shadowColor: Colors.black.withOpacity(0.3),
            borderRadius: BorderRadius.circular(16),
            child: GestureDetector(
              onTap: () {
                if (widget.onTap != null) {
                  widget.onTap!();
                }
                _dismiss();
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.15)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        icon,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Roboto',
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.message,
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                              fontFamily: 'Roboto',
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                      onPressed: _dismiss,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

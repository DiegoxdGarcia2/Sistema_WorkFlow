/// Configuración de entorno para la app móvil BPM.
///
/// Cambia [useProd] a `true` para apuntar a producción en Cloud Run,
/// o `false` para desarrollo local.
class AppConfig {
  AppConfig._();

  /// ═══ CAMBIAR AQUÍ PARA ALTERNAR ENTRE LOCAL Y PRODUCCIÓN ═══
  static const bool useProd = true;

  // ── URLs de Producción (Cloud Run) ──
  static const String _prodApiUrl = 'https://bpm-backend-core-238791343286.us-central1.run.app/api';
  static const String _prodWsUrl = 'wss://bpm-backend-core-238791343286.us-central1.run.app/ws-bpm';

  // ── URLs de Desarrollo Local ──
  static const String _devApiUrlWeb = 'http://localhost:8080/api';
  static const String _devApiUrlMobile = 'http://192.168.100.31:8080/api';
  static const String _devWsUrlWeb = 'ws://localhost:8080/ws-bpm';
  static const String _devWsUrlMobile = 'ws://192.168.100.31:8080/ws-bpm';

  /// URL base de la API REST según el entorno y la plataforma.
  static String get apiUrl {
    if (useProd) return _prodApiUrl;
    // En desarrollo, diferencia entre web y mobile
    return const bool.fromEnvironment('dart.library.html', defaultValue: false)
        ? _devApiUrlWeb
        : _devApiUrlMobile;
  }

  /// URL del WebSocket STOMP según el entorno y la plataforma.
  static String get wsUrl {
    if (useProd) return _prodWsUrl;
    return const bool.fromEnvironment('dart.library.html', defaultValue: false)
        ? _devWsUrlWeb
        : _devWsUrlMobile;
  }
}

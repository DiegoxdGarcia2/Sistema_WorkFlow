import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/models/tramite_model.dart';
import 'features/notifications/websocket_notification_service.dart';
import 'features/notifications/fcm_service.dart';
import 'core/network/network_provider.dart';
import 'core/navigation/navigation_service.dart';
import 'features/auth/login_screen.dart';
import 'features/sync/sync_worker.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicialización de Firebase (con manejo de excepciones seguro)
  try {
    await Firebase.initializeApp();
    debugPrint('[Startup] Firebase inicializado con éxito.');
  } catch (e) {
    debugPrint('[Startup] Error inicializando Firebase. Las notificaciones push no funcionarán: $e');
  }
  
  // Inicialización de Hive Offline-First
  await Hive.initFlutter();
  Hive.registerAdapter(TramiteModelAdapter());
  
  // Abrimos la caja (box) de Hive donde se almacenan los trámites localmente
  await Hive.openBox<TramiteModel>('tramites_box');
  final authBox = await Hive.openBox('auth_box');
  
  if (kDebugMode) {
    print('[Startup] Hive auth_box token: ${authBox.get('token')}');
    print('[Startup] Hive auth_box clienteId: ${authBox.get('clienteId')}');
  }

  runApp(const ProviderScope(child: BpmMobileApp()));
}

class BpmMobileApp extends ConsumerStatefulWidget {
  const BpmMobileApp({super.key});

  @override
  ConsumerState<BpmMobileApp> createState() => _BpmMobileAppState();
}

class _BpmMobileAppState extends ConsumerState<BpmMobileApp> {
  @override
  void initState() {
    super.initState();
    // Iniciar el worker de sincronización y el servicio FCM en background de manera silenciosa
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(syncWorkerProvider).startListening();
      ref.read(fcmServiceProvider).init();
    });
  }

  @override
  Widget build(BuildContext context) {
    // Escuchar cambios en la autenticación para conectar/desconectar las notificaciones en tiempo real
    ref.listen<String?>(clientIdProvider, (previous, next) {
      if (next != null && next.isNotEmpty) {
        ref.read(websocketNotificationServiceProvider).connect();
        ref.read(fcmServiceProvider).registerTokenOnBackend();
      } else {
        ref.read(websocketNotificationServiceProvider).disconnect();
      }
    });

    return MaterialApp(
      navigatorKey: navigatorKey,
      scaffoldMessengerKey: scaffoldMessengerKey,
      title: 'BPM Cliente',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D47A1), // Azul oscuro institucional
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

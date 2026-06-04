import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import '../tramites/tramites_list_screen.dart';
import '../../core/network/network_provider.dart';
import '../sync/sync_worker.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _obscureText = true;
  bool _isLoading = false;
  final TextEditingController _emailController = TextEditingController(text: 'diegogarcia@cre-client.com');
  final TextEditingController _passwordController = TextEditingController(text: 'password123');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final token = ref.read(authTokenProvider);
      final clienteId = ref.read(clientIdProvider);
      debugPrint('[Login-Init] token: $token, clienteId: $clienteId');
      if (token != null && token.isNotEmpty && clienteId != null && clienteId.isNotEmpty) {
        debugPrint('[Auth] Sesión activa encontrada. Redirigiendo a Mis Trámites...');
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const TramitesListScreen(),
          ),
        );
      } else {
        debugPrint('[Login-Init] No se cumple la condición de redirección.');
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final token = response.data['token'];
        String? clienteId = response.data['clienteId'];

        if (clienteId == null && token != null) {
          try {
            final parts = token.split('.');
            if (parts.length == 3) {
              final payload = parts[1];
              final normalized = base64Url.normalize(payload);
              final decoded = utf8.decode(base64Url.decode(normalized));
              final Map<String, dynamic> claims = json.decode(decoded);
              clienteId = claims['clienteId'] as String?;
              debugPrint('[Auth] Extraído clienteId desde el token JWT: $clienteId');
            }
          } catch (e) {
            debugPrint('[Auth] Error al decodificar JWT en login: $e');
          }
        }

        debugPrint('[Auth] Login exitoso. token: $token, clienteId: $clienteId');
        debugPrint('[Auth] Datos completos de la respuesta de login: ${response.data}');
        ref.read(authTokenProvider.notifier).setToken(token);
        ref.read(clientIdProvider.notifier).setClientId(clienteId);
        
        // Fetch cloud tramites
        await ref.read(syncWorkerProvider).pullTramites();
        
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const TramitesListScreen(),
            ),
          );
        }
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.response?.data?['message'] ?? 'Error de autenticación'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.account_balance,
                size: 80,
                color: Color(0xFF0D47A1),
              ),
              const SizedBox(height: 24),
              const Text(
                'BPM Inteligente',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Bienvenido. Ingrese sus credenciales para continuar de forma segura.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 48),
              TextFormField(
                controller: _emailController,
                decoration: InputDecoration(
                  labelText: 'Correo Electrónico',
                  prefixIcon: const Icon(Icons.person_outline),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscureText,
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureText ? Icons.visibility_off : Icons.visibility,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureText = !_obscureText;
                      });
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D47A1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 2,
                ),
                onPressed: _isLoading ? null : _login,
                child: _isLoading 
                    ? const SizedBox(
                        height: 20, 
                        width: 20, 
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                      )
                    : const Text(
                        'Ingresar',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
              const SizedBox(height: 24),
              TextButton.icon(
                onPressed: () {
                  // TODO: Implementar biometría (local_auth)
                },
                icon: const Icon(Icons.fingerprint, size: 28),
                label: const Text('Ingreso Biométrico'),
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF0D47A1),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}

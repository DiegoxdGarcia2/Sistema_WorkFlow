import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'dart:convert';

class AuthTokenNotifier extends Notifier<String?> {
  @override
  String? build() {
    try {
      final box = Hive.box('auth_box');
      final val = box.get('token') as String?;
      debugPrint('[AuthTokenNotifier] loaded token from Hive: $val');
      return val;
    } catch (e, s) {
      debugPrint('[AuthTokenNotifier] Error loading token: $e\n$s');
      return null;
    }
  }

  void setToken(String? token) {
    state = token;
    try {
      final box = Hive.box('auth_box');
      if (token == null) {
        box.delete('token');
      } else {
        box.put('token', token);
      }
      debugPrint('[AuthTokenNotifier] setToken in Hive success: $token');
    } catch (e, s) {
      debugPrint('[AuthTokenNotifier] Error saving token: $e\n$s');
    }
  }
}

final authTokenProvider = NotifierProvider<AuthTokenNotifier, String?>(() => AuthTokenNotifier());

class ClientIdNotifier extends Notifier<String?> {
  @override
  String? build() {
    try {
      final box = Hive.box('auth_box');
      final clienteId = box.get('clienteId') as String?;
      debugPrint('[ClientIdNotifier] loaded clienteId from Hive: $clienteId');
      if (clienteId != null && clienteId.isNotEmpty) {
        return clienteId;
      }

      // Fallback: extract from token if token is present
      final token = box.get('token') as String?;
      if (token != null && token.isNotEmpty) {
        final parts = token.split('.');
        if (parts.length == 3) {
          final payload = parts[1];
          final normalized = base64Url.normalize(payload);
          final decoded = utf8.decode(base64Url.decode(normalized));
          final Map<String, dynamic> claims = json.decode(decoded);
          final extractedId = claims['clienteId'] as String?;
          debugPrint('[ClientIdNotifier] Extracted fallback clienteId from JWT: $extractedId');
          if (extractedId != null && extractedId.isNotEmpty) {
            box.put('clienteId', extractedId);
            return extractedId;
          }
        }
      }
    } catch (e, s) {
      debugPrint('[ClientIdNotifier] Error building: $e\n$s');
    }
    return null;
  }

  void setClientId(String? clientId) {
    state = clientId;
    try {
      final box = Hive.box('auth_box');
      if (clientId == null) {
        box.delete('clienteId');
      } else {
        box.put('clienteId', clientId);
      }
      debugPrint('[ClientIdNotifier] setClientId in Hive success: $clientId');
    } catch (e, s) {
      debugPrint('[ClientIdNotifier] Error saving clientId: $e\n$s');
    }
  }
}

final clientIdProvider = NotifierProvider<ClientIdNotifier, String?>(() => ClientIdNotifier());

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: kIsWeb ? 'http://localhost:8080/api' : 'http://10.0.2.2:8080/api', 
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      final token = ref.read(authTokenProvider);
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      return handler.next(options);
    },
    onError: (DioException e, handler) {
      if (e.response?.statusCode == 401) {
        // TODO: Manejar expiración de sesión (Logout automático)
      }
      return handler.next(e);
    },
  ));

  dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));

  return dio;
});

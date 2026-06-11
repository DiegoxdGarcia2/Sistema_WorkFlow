import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bpm_mobile_client/core/network/network_provider.dart';

class UploadService {
  final Dio _dio;

  UploadService(this._dio);

  Future<Map<String, dynamic>> uploadCliente({
    required String tramiteId,
    required File file,
    Function(int sent, int total)? onProgress,
  }) async {
    final fileName = file.path.split(Platform.pathSeparator).last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: fileName,
      ),
      'tramiteId': tramiteId,
    });

    try {
      final response = await _dio.post(
        '/archivos/upload-cliente',
        data: formData,
        onSendProgress: onProgress,
      );
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception(response.data?.toString() ?? 'Error al subir el archivo');
      }
    } on DioException catch (e) {
      final msg = e.response?.data?.toString() ?? e.message ?? 'Error de red';
      throw Exception('Fallo la subida: $msg');
    }
  }

  Future<Map<String, dynamic>> getPrerequisitos(String tramiteId) async {
    try {
      final response = await _dio.get('/tramites/$tramiteId/prerequisitos');
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      } else {
        throw Exception('Error al obtener prerrequisitos');
      }
    } on DioException catch (e) {
      throw Exception('Fallo la carga de prerrequisitos: ${e.message}');
    }
  }
}

final uploadServiceProvider = Provider<UploadService>((ref) {
  final dio = ref.watch(dioProvider);
  return UploadService(dio);
});

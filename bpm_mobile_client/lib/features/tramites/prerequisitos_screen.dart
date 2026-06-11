import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import 'package:bpm_mobile_client/features/tramites/upload_service.dart';

class PrerequisitosScreen extends ConsumerStatefulWidget {
  final String tramiteId;
  final String? tramiteCodigo;

  const PrerequisitosScreen({
    super.key,
    required this.tramiteId,
    this.tramiteCodigo,
  });

  @override
  ConsumerState<PrerequisitosScreen> createState() => _PrerequisitosScreenState();
}

class _PrerequisitosScreenState extends ConsumerState<PrerequisitosScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<String> _requisitosIniciales = [];
  String? _pasoActivo;
  List<String> _documentosRequeridosPaso = [];
  List<Map<String, dynamic>> _archivosSubidos = [];

  // Uploading status mapping
  final Map<String, double> _uploadProgress = {};
  final Map<String, bool> _isUploading = {};

  @override
  void initState() {
    super.initState();
    _loadPrerequisitos();
  }

  Future<void> _loadPrerequisitos() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final uploadService = ref.read(uploadServiceProvider);
      final data = await uploadService.getPrerequisitos(widget.tramiteId);

      setState(() {
        _requisitosIniciales = List<String>.from(data['requisitosIniciales'] ?? []);
        _pasoActivo = data['pasoActivo'];
        _documentosRequeridosPaso = List<String>.from(data['documentosRequeridosPaso'] ?? []);
        _archivosSubidos = List<Map<String, dynamic>>.from(data['archivosSubidos'] ?? []);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  bool _isDocumentUploaded(String docName) {
    return _archivosSubidos.any((a) {
      final nombreArchivo = (a['nombre'] as String).toLowerCase();
      final nombreDoc = docName.toLowerCase();
      // Match if the file name contains the requested document type
      return nombreArchivo.contains(nombreDoc) || nombreDoc.contains(nombreArchivo);
    });
  }

  String? _getUploadedFileName(String docName) {
    try {
      final matched = _archivosSubidos.firstWhere((a) {
        final nombreArchivo = (a['nombre'] as String).toLowerCase();
        final nombreDoc = docName.toLowerCase();
        return nombreArchivo.contains(nombreDoc) || nombreDoc.contains(nombreArchivo);
      });
      return matched['nombre'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> _pickAndUploadFile(String docName) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'],
      );

      if (result == null || result.files.single.path == null) {
        return; // User cancelled
      }

      final filePath = result.files.single.path!;
      final file = File(filePath);

      // Validate 20MB limit
      final size = await file.length();
      if (size > 20 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('El archivo excede el tamaño máximo de 20MB.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        return;
      }

      setState(() {
        _isUploading[docName] = true;
        _uploadProgress[docName] = 0.0;
      });

      final uploadService = ref.read(uploadServiceProvider);
      await uploadService.uploadCliente(
        tramiteId: widget.tramiteId,
        file: file,
        onProgress: (sent, total) {
          if (total > 0 && mounted) {
            setState(() {
              _uploadProgress[docName] = sent / total;
            });
          }
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Documento "$docName" subido correctamente.'),
            backgroundColor: Colors.green,
          ),
        );
      }

      // Reload state
      await _loadPrerequisitos();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al subir archivo: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading[docName] = false;
          _uploadProgress.remove(docName);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Unify all required documents
    final allRequired = <String>{};
    allRequired.addAll(_requisitosIniciales);
    allRequired.addAll(_documentosRequeridosPaso);

    final pendingDocs = allRequired.where((doc) => !_isDocumentUploaded(doc)).toList();
    final completedDocs = allRequired.where((doc) => _isDocumentUploaded(doc)).toList();

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
        title: const Text(
          'Requisitos del Trámite',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadPrerequisitos,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFF2563EB)),
                  SizedBox(height: 16),
                  Text(
                    'Cargando requisitos del trámite...',
                    style: TextStyle(color: Colors.grey, fontSize: 15),
                  ),
                ],
              ),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
                        const SizedBox(height: 16),
                        Text(
                          'Error al cargar requisitos',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _loadPrerequisitos,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Reintentar'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E3A8A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : CustomScrollView(
                  slivers: [
                    SliverToBoxAdapter(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        margin: const EdgeInsets.all(16),
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
                            Row(
                              children: [
                                Icon(Icons.description_outlined, color: Colors.blue[800]),
                                const SizedBox(width: 8),
                                Text(
                                  widget.tramiteCodigo != null
                                      ? 'Trámite #${widget.tramiteCodigo}'
                                      : 'Código de Trámite',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            if (_pasoActivo != null) ...[
                              Row(
                                children: [
                                  Text(
                                    'Paso actual: ',
                                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                                  ),
                                  Text(
                                    _pasoActivo!,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1E3A8A),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                            ],
                            Row(
                              children: [
                                Text(
                                  'Estado general: ',
                                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: pendingDocs.isEmpty
                                        ? Colors.green.withOpacity(0.1)
                                        : Colors.orange.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    pendingDocs.isEmpty ? 'Completo' : 'Pendiente de Documentos',
                                    style: TextStyle(
                                      color: pendingDocs.isEmpty ? Colors.green[800] : Colors.orange[800],
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (pendingDocs.isNotEmpty) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                          child: Text(
                            'DOCUMENTOS PENDIENTES (${pendingDocs.length})',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[600],
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final docName = pendingDocs[index];
                              final isUploading = _isUploading[docName] ?? false;
                              final progress = _uploadProgress[docName] ?? 0.0;

                              return Card(
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(color: Colors.grey.shade200),
                                ),
                                margin: const EdgeInsets.only(bottom: 12),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.cloud_upload_outlined, color: Colors.blue[600], size: 28),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  docName,
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 15,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  'Formatos: PDF, JPG, PNG, DOCX, XLSX (Max 20MB)',
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.grey[500],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (isUploading) ...[
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: LinearProgressIndicator(
                                                value: progress,
                                                backgroundColor: Colors.grey[200],
                                                color: Colors.blue[600],
                                                minHeight: 6,
                                                borderRadius: BorderRadius.circular(3),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Text(
                                              '${(progress * 100).toStringAsFixed(0)}%',
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.blue[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ] else ...[
                                        const SizedBox(height: 12),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton.icon(
                                            onPressed: () => _pickAndUploadFile(docName),
                                            icon: const Icon(Icons.file_upload_outlined),
                                            label: const Text('Subir Archivo'),
                                            style: TextButton.styleFrom(
                                              foregroundColor: Colors.blue[700],
                                              backgroundColor: Colors.blue.shade50,
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(8),
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              );
                            },
                            childCount: pendingDocs.length,
                          ),
                        ),
                      ),
                    ],
                    if (completedDocs.isNotEmpty) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          child: Text(
                            'DOCUMENTOS ENTREGADOS (${completedDocs.length})',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[600],
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final docName = completedDocs[index];
                              final actualName = _getUploadedFileName(docName) ?? docName;

                              return Card(
                                elevation: 0,
                                color: Colors.green.shade50.withOpacity(0.4),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(color: Colors.green.shade100),
                                ),
                                margin: const EdgeInsets.only(bottom: 12),
                                child: ListTile(
                                  leading: const Icon(Icons.check_circle, color: Colors.green, size: 28),
                                  title: Text(
                                    docName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  subtitle: Text(
                                    actualName,
                                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              );
                            },
                            childCount: completedDocs.length,
                          ),
                        ),
                      ),
                    ],
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Align(
                        alignment: Alignment.bottomCenter,
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: () => Navigator.pop(context),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0F172A),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                pendingDocs.isEmpty ? 'Finalizar' : 'Volver',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

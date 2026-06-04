import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:dio/dio.dart';
import '../../core/network/network_provider.dart';
import '../../core/navigation/navigation_service.dart';

class AssistantBottomSheet extends ConsumerStatefulWidget {
  const AssistantBottomSheet({super.key});

  @override
  ConsumerState<AssistantBottomSheet> createState() => _AssistantBottomSheetState();
}

class _AssistantBottomSheetState extends ConsumerState<AssistantBottomSheet> {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  bool _isProcessing = false;
  final TextEditingController _promptController = TextEditingController();
  
  @override
  void dispose() {
    _promptController.dispose();
    _speech.stop();
    super.dispose();
  }

  Future<void> _toggleListen() async {
    if (!_isListening) {
      bool available = await _speech.initialize(
        onStatus: (val) {
          if (val == 'done') {
            setState(() => _isListening = false);
          }
        },
        onError: (val) {
          debugPrint('Speech error: $val');
          setState(() => _isListening = false);
        },
      );
      
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) {
            setState(() {
              _promptController.text = val.recognizedWords;
            });
          },
          localeId: 'es_ES',
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  Future<void> _submitPrompt() async {
    final prompt = _promptController.text.trim();
    if (prompt.isEmpty) return;

    if (_isListening) {
      _speech.stop();
      setState(() => _isListening = false);
    }

    setState(() => _isProcessing = true);
    try {
      final dio = ref.read(dioProvider);
      
      final response = await dio.post(
        '/tramites/ai-iniciar',
        data: {'prompt': prompt},
      );

      final data = response.data;
      if (mounted) {
        Navigator.pop(context, data['success'] == true); 
        scaffoldMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(
              data['success'] == true ? '¡Trámite Creado! ${data["message"]}' : 'AI: ${data["message"]}',
              style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.white),
            ), 
            backgroundColor: data['success'] == true ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
            duration: const Duration(seconds: 20),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            action: SnackBarAction(
              label: 'X',
              textColor: Colors.white,
              onPressed: () {
                scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
              },
            ),
          ),
        );
      }
    } on DioException catch (e) {
      debugPrint('Error en la inferencia AI: ${e.response?.data}');
      if (mounted) {
        Navigator.pop(context, false);
        scaffoldMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(
              e.response?.data?['message'] ?? 'Error de conexión con IA.',
              style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.white),
            ), 
            backgroundColor: const Color(0xFFEF4444),
            duration: const Duration(seconds: 20),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            action: SnackBarAction(
              label: 'X',
              textColor: Colors.white,
              onPressed: () {
                scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
              },
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 24,
        left: 24,
        right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24, // Ajuste teclado
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1E1E1E),
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 24),
              decoration: BoxDecoration(
                color: Colors.grey.shade700,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const Text(
              '¿En qué podemos ayudarte?',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Escribe o dicta tu solicitud.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 24),
            
            // Text Field
            TextField(
              controller: _promptController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Ej: Quiero solicitar la instalación...',
                hintStyle: const TextStyle(color: Colors.grey),
                filled: true,
                fillColor: const Color(0xFF2C2C2C),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _isListening ? Icons.mic : Icons.mic_none,
                    color: _isListening ? Colors.red : Colors.grey,
                  ),
                  onPressed: _toggleListen,
                ),
              ),
              onSubmitted: (_) => _submitPrompt(),
            ),
            
            const SizedBox(height: 24),
            
            // Botón Solicitar
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0D47A1),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _isProcessing ? null : _submitPrompt,
                child: _isProcessing
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text(
                        'Solicitar',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

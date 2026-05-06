import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface AiAction {
  tipo: string;
  params: any;
}

export interface AiResponse {
  explicacion: string;
  acciones: AiAction[];
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private apiUrl = 'http://localhost:8080/api/ai';
  private recognition: any;

  private isListening = false;

  constructor(private http: HttpClient) {
    // Inicializar Web Speech API si está disponible
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.interimResults = true;
      this.recognition.continuous = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  // ── 1. Ejecutar comando NLP a través del Backend ──
  ejecutarComando(politicaId: string, instruccion: string, contextoActual: any): Observable<AiResponse> {
    const payload = {
      politicaId,
      instruccion,
      contexto: contextoActual
    };
    console.log('[AiAssistant] Sending command:', payload);
    return this.http.post<AiResponse>(`${this.apiUrl}/command`, payload);
  }

  // ── 2. Speech to Text (Voz a Texto) ──
  empezarAEscuchar(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void, onEnd: () => void): void {
    if (!this.recognition) {
      // Detección de Brave para mensaje específico
      const isBrave = !!(navigator as any).brave && (navigator as any).brave.isBrave();
      if (isBrave) {
        onError('Brave deshabilita el reconocimiento de voz de Google por defecto. Debes habilitar "Google Services" en la configuración de Brave o usar Chrome.');
      } else {
        onError('El navegador no soporta reconocimiento de voz');
      }
      return;
    }

    if (this.isListening) {
      return; // Ya está escuchando, no volver a iniciar para evitar InvalidStateError
    }

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onResult(transcript, true);
        } else {
          onResult(transcript, false);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('[AiAssistant] Error de SpeechRecognition:', event.error);
      if (event.error === 'network' || event.error === 'not-allowed') {
        console.log('[AiAssistant] Fallback a Whisper (MediaRecorder)...');
        this.iniciarGrabacionWhisper(onResult, onError, onEnd);
        return; // No disparamos el error hacia arriba para que la UI no se rompa
      }
      this.isListening = false;
      onError(event.error);
    };
    
    this.recognition.onend = () => {
      // Si estamos en modo fallback, no cambiamos el estado
      if (!this.mediaRecorder) {
        this.isListening = false;
        onEnd();
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
    } catch(e) {
      console.warn('[AiAssistant] Error iniciando Web Speech API, intentando fallback...', e);
      this.iniciarGrabacionWhisper(onResult, onError, onEnd);
    }
  }

  // ── Grabación Manual (Whisper Fallback) ──
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  private iniciarGrabacionWhisper(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void, onEnd: () => void) {
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.transcribirConWhisper(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Apagar micrófono
      };

      this.mediaRecorder.start();
      this.isListening = true;
      // Enviamos un texto temporal a la UI para indicar que estamos grabando
      onResult('Grabando audio (Brave/Fallback)...', false);
    }).catch(err => {
      this.isListening = false;
      onError('Permiso de micrófono denegado para Whisper.');
    });
  }

  private transcribirConWhisper(audioBlob: Blob) {
    if (this.onResultCallback) this.onResultCallback('Transcribiendo...', false);
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    this.http.post<{text: string}>(`http://localhost:8000/api/ai/stt`, formData).subscribe({
      next: (res) => {
        if (this.onResultCallback) this.onResultCallback(res.text, true);
        if (this.onEndCallback) this.onEndCallback();
      },
      error: (err) => {
        if (this.onErrorCallback) this.onErrorCallback(err);
        if (this.onEndCallback) this.onEndCallback();
      }
    });
  }

  detenerEscucha(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
      // isListening se apagará cuando termine Whisper
    } else if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // ── 3. Text to Speech (ElevenLabs con Fallback nativo) ──
  hablar(texto: string): void {
    const aiServiceTtsUrl = `http://localhost:8000/api/ai/tts?text=${encodeURIComponent(texto)}`;
    
    const audio = new Audio(aiServiceTtsUrl);
    audio.play().catch(err => {
      console.warn('[AiAssistant] ElevenLabs fallo o no esta configurado, usando voz nativa:', err);
      // Fallback a voz nativa si falla ElevenLabs
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(texto);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
      }
    });
  }
}


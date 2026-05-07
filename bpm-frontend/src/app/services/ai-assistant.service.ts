import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


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
  private apiUrl = `${environment.apiUrl}/ai`;
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
  async empezarAEscuchar(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void, onEnd: () => void): Promise<void> {
    // Detectar Brave para evitar el cuelgue de la Web Speech API nativa
    let isBrave = false;
    try { 
      isBrave = !!(navigator as any).brave && (await (navigator as any).brave.isBrave());
    } catch (e) { isBrave = false; }

    if (!this.recognition || isBrave) {
      if (isBrave) console.log('[AiAssistant] Brave detectado: Usando Whisper directamente.');
      await this.iniciarGrabacionWhisper(onResult, onError, onEnd);
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
        this.iniciarGrabacionWhisper(onResult, onError, onEnd).catch(e => onError(e));
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
      this.iniciarGrabacionWhisper(onResult, onError, onEnd).catch(ex => onError(ex));
    }
  }

  // ── Grabación Manual (Whisper Fallback) ──
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onResultCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  private iniciarGrabacionWhisper(onResult: (text: string, isFinal: boolean) => void, onError: (err: any) => void, onEnd: () => void): Promise<void> {
    this.onResultCallback = onResult;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;
    this.isListening = true; 

    return new Promise((resolve, reject) => {
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
          this.isListening = false;
        };

        this.mediaRecorder.start();
        this.isListening = true;
        onResult('Escuchando (Brave)... Hable ahora.', false);
        
        // --- Detector automático de silencio (VAD simple) ---
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.minDecibels = -50; // Umbral de silencio
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let silenceStart = Date.now();
          let hasSpoken = false;

          const checkSilence = () => {
            if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
               audioContext.close().catch(() => {});
               return;
            }

            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            
            if (sum > 0) {
              hasSpoken = true;
              silenceStart = Date.now();
            } else if (hasSpoken && Date.now() - silenceStart > 1800) {
              // Si ya habló y hubo 1.8s de silencio, detenemos automáticamente
              this.detenerEscucha();
              audioContext.close().catch(() => {});
              return;
            }

            requestAnimationFrame(checkSilence);
          };
          checkSilence();
        } catch(err) {
          console.warn('No se pudo inicializar detector de silencio:', err);
        }
        // ----------------------------------------------------

        resolve();
      }).catch(err => {
        this.isListening = false;
        reject('Permiso de micrófono denegado para Whisper.');
      });
    });
  }

  private transcribirConWhisper(audioBlob: Blob) {
    if (this.onResultCallback) this.onResultCallback('Transcribiendo...', false);
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    this.http.post<{text: string}>(`${environment.aiServiceUrl}/stt`, formData).subscribe({
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
      // El stream se apaga en el callback onstop de mediaRecorder
      this.mediaRecorder = null;
    } else if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  // ── 3. Text to Speech (ElevenLabs con Fallback nativo) ──
  hablar(texto: string): void {
    const aiServiceTtsUrl = `${environment.aiServiceUrl}/tts?text=${encodeURIComponent(texto)}`;
    
    const audio = new Audio(aiServiceTtsUrl);
    audio.play().catch(err => {
      console.warn('[AiAssistant] ElevenLabs falló (posible restricción de cuenta gratuita en Cloud Run), usando voz nativa optimizada:', err);
      // Fallback a voz nativa si falla ElevenLabs
      if ('speechSynthesis' in window) {
        const speak = () => {
          const utterance = new SpeechSynthesisUtterance(texto);
          const voices = window.speechSynthesis.getVoices();
          
          // Intentar buscar una voz más natural (Google, Helena, Monica)
          const preferredVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google')) ||
                                 voices.find(v => v.lang.startsWith('es') && v.name.includes('Helena')) ||
                                 voices.find(v => v.lang.startsWith('es') && v.name.includes('Natural')) ||
                                 voices.find(v => v.lang.startsWith('es') && v.lang.includes('ES'));
          
          if (preferredVoice) utterance.voice = preferredVoice;
          utterance.lang = 'es-ES';
          utterance.rate = 1.0; 
          utterance.pitch = 1.0; 
          
          window.speechSynthesis.cancel(); 
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => { speak(); window.speechSynthesis.onvoiceschanged = null; };
        } else {
          speak();
        }
      }
    });
  }
}


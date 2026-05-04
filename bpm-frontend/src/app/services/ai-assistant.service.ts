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

  constructor(private http: HttpClient) {
    // Inicializar Web Speech API si está disponible
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.interimResults = true;
      this.recognition.continuous = false;
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

    this.recognition.onerror = (event: any) => onError(event.error);
    this.recognition.onend = () => onEnd();

    try {
      this.recognition.start();
    } catch(e) {
      onError(e);
    }
  }

  detenerEscucha(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // ── 3. Text to Speech (Opcional para dar feedback auditivo) ──
  hablar(texto: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-ES';
      window.speechSynthesis.speak(utterance);
    }
  }
}

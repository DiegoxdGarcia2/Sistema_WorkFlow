import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessageDto {
  role: string;
  content: string;
}

export interface ChatbotRequest {
  mensaje: string;
  contextoSeccion: string;
  historial?: ChatMessageDto[];
}

export interface ChatbotResponse {
  respuesta: string;
  rutaNavegacion?: string;
  acciones?: ActionButton[];
}

export interface ActionButton {
  label: string;
  ruta?: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) { }

  consultar(mensaje: string, contextoSeccion: string, historial?: ChatMessageDto[]): Observable<ChatbotResponse> {
    console.log('🚀 ChatbotService: Enviando pregunta (síncrona)...', { mensaje, contextoSeccion });
    const payload: ChatbotRequest = { mensaje, contextoSeccion, historial };
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/consultar`, payload);
  }

  /**
   * Consume el endpoint de SSE usando fetch y ReadableStream.
   * Llama a los callbacks en cada chunk recibido y cuando finaliza.
   */
  async consultarStream(
    mensaje: string, 
    contextoSeccion: string, 
    historial: ChatMessageDto[] = [],
    onChunk: (text: string) => void,
    onDone: (data: any) => void,
    onError: (error: any) => void
  ): Promise<void> {
    const payload: ChatbotRequest = { mensaje, contextoSeccion, historial };
    let streamTerminatedGracefully = false;
    
    try {
      const token = localStorage.getItem('bpm_token');
      
      const response = await fetch(`${this.apiUrl}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Un chunk de SSE puede contener múltiples líneas 'data: {...}\n\n'
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.substring(5).trim();
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                streamTerminatedGracefully = true;
                onDone(data);
              } else if (data.text) {
                onChunk(data.text);
              }
            } catch (e) {
              console.warn('Error parseando JSON de SSE:', dataStr);
            }
          }
        }
      }
    } catch (error) {
      if (!streamTerminatedGracefully) {
        console.error('Error en consultarStream:', error);
        onError(error);
      } else {
        console.warn('Stream terminado abruptamente tras enviar "done". Se ignora el error.', error);
      }
    }
  }
}

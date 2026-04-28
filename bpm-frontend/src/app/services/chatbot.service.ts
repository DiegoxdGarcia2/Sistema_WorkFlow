import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface ChatbotRequest {
  mensaje: string;
  contextoSeccion: string;
}

export interface ChatbotResponse {
  respuesta: string;
  rutaNavegacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://127.0.0.1:8080/api/chatbot';

  constructor(private http: HttpClient) { }

  consultar(mensaje: string, contextoSeccion: string): Observable<ChatbotResponse> {
    console.log('🚀 ChatbotService: Enviando pregunta...', { mensaje, contextoSeccion });
    const payload: ChatbotRequest = { mensaje, contextoSeccion };
    return this.http.post<ChatbotResponse>(`${this.apiUrl}/consultar`, payload);
  }
}

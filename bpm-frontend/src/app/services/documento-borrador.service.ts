import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DocumentoBorrador {
  id?: string;
  tramiteId: string;
  tenantId: string;
  contenidoHtml: string;
  estadoBinarioYjs?: any; // Binario en mongo, string base64 en DTO si se prefiere
  actualizadoEn?: Date;
  modificadoPor?: string;
  archivado?: boolean;
  nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentoBorradorService {
  private http = inject(HttpClient);

  getOrCreateDraft(tramiteId: string): Observable<DocumentoBorrador> {
    return this.http.get<DocumentoBorrador>(`${environment.apiUrl}/documentos-borradores/tramite/${tramiteId}`);
  }

  saveDraft(tramiteId: string, contenidoHtml: string, estadoBinarioYjsBase64: string, nombre?: string): Observable<DocumentoBorrador> {
    const payload = {
      contenidoHtml,
      estadoBinarioYjsBase64,
      nombre
    };
    return this.http.put<DocumentoBorrador>(`${environment.apiUrl}/documentos-borradores/tramite/${tramiteId}`, payload);
  }

  getAuditLogs(tramiteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/documentos-borradores/tramite/${tramiteId}/auditoria`);
  }

  publicarAS3(tramiteId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/tramites/${tramiteId}/documentos/compilar-borrador`, {});
  }
}

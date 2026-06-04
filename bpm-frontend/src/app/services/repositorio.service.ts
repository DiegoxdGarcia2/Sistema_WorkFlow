import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RepositorioDTO {
  agrupacion: {
    [politica: string]: {
      [cliente: string]: any[]
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class RepositorioService {
  private http = inject(HttpClient);

  getRepositorioDocumental(): Observable<RepositorioDTO> {
    return this.http.get<RepositorioDTO>(`${environment.apiUrl}/repositorio/agrupado`);
  }

  buscarODocumentoColaborativo(documentoId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/documentos-colaborativos/${documentoId}`);
  }

  guardarDocumentoColaborativo(id: string, doc: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/documentos-colaborativos/${id}`, doc);
  }
}

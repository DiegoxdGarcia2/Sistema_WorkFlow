import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PoliticaDTO } from '../models/bpm.models';

@Injectable({ providedIn: 'root' })
export class PoliticaService {
  private readonly baseUrl = 'http://localhost:8080/api/politicas';

  /** Signal reactivo: lista de políticas cargadas */
  politicas = signal<PoliticaDTO[]>([]);

  constructor(private http: HttpClient) {}

  listarPorTenant(tenantId: string): Observable<PoliticaDTO[]> {
    return this.http.get<PoliticaDTO[]>(`${this.baseUrl}/tenant/${tenantId}`).pipe(
      tap(data => this.politicas.set(data))
    );
  }

  listarActivasPorTenant(tenantId: string): Observable<PoliticaDTO[]> {
    return this.http.get<PoliticaDTO[]>(`${this.baseUrl}/tenant/${tenantId}/activas`);
  }

  buscarPorId(id: string): Observable<PoliticaDTO> {
    return this.http.get<PoliticaDTO>(`${this.baseUrl}/${id}`);
  }

  crear(politica: Partial<PoliticaDTO>): Observable<PoliticaDTO> {
    return this.http.post<PoliticaDTO>(this.baseUrl, politica);
  }

  actualizar(id: string, politica: Partial<PoliticaDTO>): Observable<PoliticaDTO> {
    return this.http.put<PoliticaDTO>(`${this.baseUrl}/${id}`, politica);
  }

  activar(id: string): Observable<PoliticaDTO> {
    return this.http.patch<PoliticaDTO>(`${this.baseUrl}/${id}/activar`, {});
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

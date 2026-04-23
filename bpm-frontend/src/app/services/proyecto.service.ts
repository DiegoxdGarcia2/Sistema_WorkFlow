import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ProyectoDTO } from '../models/bpm.models';

@Injectable({ providedIn: 'root' })
export class ProyectoService {
  private readonly baseUrl = 'http://localhost:8080/api/proyectos';

  proyectos = signal<ProyectoDTO[]>([]);

  constructor(private http: HttpClient) {}

  listarPorTenant(tenantId: string): Observable<ProyectoDTO[]> {
    return this.http.get<ProyectoDTO[]>(`${this.baseUrl}/tenant/${tenantId}`).pipe(
      tap(data => this.proyectos.set(data))
    );
  }

  buscarPorId(id: string): Observable<ProyectoDTO> {
    return this.http.get<ProyectoDTO>(`${this.baseUrl}/${id}`);
  }

  crear(proyecto: Partial<ProyectoDTO>): Observable<ProyectoDTO> {
    return this.http.post<ProyectoDTO>(this.baseUrl, proyecto);
  }

  actualizar(id: string, proyecto: Partial<ProyectoDTO>): Observable<ProyectoDTO> {
    return this.http.put<ProyectoDTO>(`${this.baseUrl}/${id}`, proyecto);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

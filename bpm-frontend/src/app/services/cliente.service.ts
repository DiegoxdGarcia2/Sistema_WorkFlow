import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ClienteDTO } from '../models/bpm.models';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly baseUrl = 'http://localhost:8080/api/clientes';

  /** Signal reactivo: lista de clientes cargados */
  clientes = signal<ClienteDTO[]>([]);

  constructor(private http: HttpClient) {}

  listarPorTenant(tenantId: string): Observable<ClienteDTO[]> {
    return this.http.get<ClienteDTO[]>(`${this.baseUrl}/tenant/${tenantId}`).pipe(
      tap(data => this.clientes.set(data))
    );
  }

  buscar(tenantId: string, termino: string): Observable<ClienteDTO[]> {
    return this.http.get<ClienteDTO[]>(`${this.baseUrl}/tenant/${tenantId}/buscar`, {
      params: { q: termino }
    });
  }

  crear(cliente: Partial<ClienteDTO>): Observable<ClienteDTO> {
    return this.http.post<ClienteDTO>(this.baseUrl, cliente);
  }

  actualizar(id: string, cliente: Partial<ClienteDTO>): Observable<ClienteDTO> {
    return this.http.put<ClienteDTO>(`${this.baseUrl}/${id}`, cliente);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

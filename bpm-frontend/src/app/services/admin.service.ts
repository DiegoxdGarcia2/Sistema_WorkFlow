import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface TenantDTO {
  id: string;
  nombre: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface UsuarioDTO {
  id: string;
  tenantId: string;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
  creadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = 'http://localhost:8080/api';

  tenants = signal<TenantDTO[]>([]);
  usuarios = signal<UsuarioDTO[]>([]);

  constructor(private http: HttpClient) {}

  cargarTenants(): Observable<TenantDTO[]> {
    return this.http.get<TenantDTO[]>(`${this.baseUrl}/tenants`).pipe(
      tap(data => this.tenants.set(data))
    );
  }

  cargarUsuarios(tenantId: string): Observable<UsuarioDTO[]> {
    return this.http.get<UsuarioDTO[]>(`${this.baseUrl}/usuarios/tenant/${tenantId}`).pipe(
      tap(data => this.usuarios.set(data))
    );
  }
}

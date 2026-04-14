import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface TenantDTO { id: string; nombre: string; creadoEn: string; actualizadoEn: string; }

export interface UsuarioListDTO {
  id: string; tenantId: string; nombre: string; apellido: string;
  email: string; telefono: string; cargo: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
  activo: boolean; creadoEn: string;
}

export interface CrearUsuarioRequest {
  nombre: string; apellido: string; email: string; password: string;
  telefono: string; cargo: string; rol: string;
}

export interface EditarUsuarioRequest {
  nombre?: string; apellido?: string; email?: string; telefono?: string;
  cargo?: string; rol?: string; activo?: boolean;
}

export interface AuditLogDTO {
  id: string; usuarioNombre: string; accion: string; entidad: string;
  detalle: string; timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = 'http://localhost:8080/api';

  tenants = signal<TenantDTO[]>([]);
  usuarios = signal<UsuarioListDTO[]>([]);
  auditLogs = signal<AuditLogDTO[]>([]);

  constructor(private http: HttpClient) {}

  cargarTenants(): Observable<TenantDTO[]> {
    return this.http.get<TenantDTO[]>(`${this.baseUrl}/tenants`).pipe(tap(d => this.tenants.set(d)));
  }

  cargarUsuarios(tenantId: string): Observable<UsuarioListDTO[]> {
    return this.http.get<UsuarioListDTO[]>(`${this.baseUrl}/usuarios/tenant/${tenantId}`).pipe(tap(d => this.usuarios.set(d)));
  }

  crearUsuario(tenantId: string, req: CrearUsuarioRequest): Observable<UsuarioListDTO> {
    return this.http.post<UsuarioListDTO>(`${this.baseUrl}/usuarios/tenant/${tenantId}`, req);
  }

  editarUsuario(id: string, req: EditarUsuarioRequest): Observable<UsuarioListDTO> {
    return this.http.put<UsuarioListDTO>(`${this.baseUrl}/usuarios/${id}`, req);
  }

  toggleActivo(id: string): Observable<UsuarioListDTO> {
    return this.http.patch<UsuarioListDTO>(`${this.baseUrl}/usuarios/${id}/toggle-activo`, {});
  }

  cargarAuditLog(tenantId: string): Observable<AuditLogDTO[]> {
    return this.http.get<AuditLogDTO[]>(`${this.baseUrl}/audit/tenant/${tenantId}`).pipe(tap(d => this.auditLogs.set(d)));
  }
}

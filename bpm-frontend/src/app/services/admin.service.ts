import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AtributoExtra {
  nombre: string;
  tipo: string;
  valor: string;
}

export interface TenantDTO { 
  id: string; 
  nombre: string; 
  nit?: string;
  direccion?: string;
  industria?: string;
  sitioWeb?: string;
  telefonoInstitucional?: string;
  emailContacto?: string;
  logoUrl?: string;
  lema?: string;
  creadoEn: string; 
  actualizadoEn: string; 
}

export interface UsuarioListDTO {
  id: string; tenantId: string; nombre: string; apellido: string;
  email: string; telefono: string; cargo: string; departamento: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
  activo: boolean; creadoEn: string;
}

export interface CrearUsuarioRequest {
  nombre: string; apellido: string; email: string; password: string;
  telefono: string; cargo: string; departamento: string; rol: string;
}

export interface EditarUsuarioRequest {
  nombre?: string; apellido?: string; email?: string; telefono?: string;
  cargo?: string; departamento?: string; rol?: string; activo?: boolean;
}

export interface AuditLogDTO {
  id: string; usuarioNombre: string; accion: string; entidad: string;
  detalle: string; timestamp: string;
}

export interface Cargo { 
  id: string; 
  tenantId: string; 
  nombre: string; 
  descripcion?: string; 
  codigo?: string; 
  salarioBase?: number; 
  nivel?: 'OPERATIVO' | 'TECNICO' | 'JEFATURA' | 'GERENCIA' | 'DIRECTORIO'; 
  atributosExtra?: AtributoExtra[];
}

export interface Departamento { 
  id: string; 
  tenantId: string; 
  nombre: string; 
  descripcion?: string; 
  codigo?: string; 
  ubicacion?: string; 
  presupuesto?: number; 
  atributosExtra?: AtributoExtra[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = 'http://localhost:8080/api';

  tenants = signal<TenantDTO[]>([]);
  usuarios = signal<UsuarioListDTO[]>([]);
  auditLogs = signal<AuditLogDTO[]>([]);
  cargos = signal<Cargo[]>([]);
  departamentos = signal<Departamento[]>([]);

  constructor(private http: HttpClient) {}

  monitorTramites(tenantId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tramites/monitor/tenant/${tenantId}`);
  }

  cargarHistorialTramites(tenantId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tramites/historial/tenant/${tenantId}`);
  }

  obtenerTracking(tramiteId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/tramites/${tramiteId}/tracking`);
  }

  cancelarTramite(id: string): Observable<any> {
    const url = `${this.baseUrl}/tramites/${id}/cancelar`;
    console.log('🚀 Enviando POST a:', url);
    return this.http.post<any>(url, {});
  }

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

  // --- Cargos ---
  cargarCargos(tenantId: string): Observable<Cargo[]> {
    return this.http.get<Cargo[]>(`${this.baseUrl}/cargos/tenant/${tenantId}`).pipe(tap(d => this.cargos.set(d)));
  }
  crearCargo(tenantId: string, data: Partial<Cargo>): Observable<Cargo> {
    return this.http.post<Cargo>(`${this.baseUrl}/cargos/tenant/${tenantId}`, data);
  }
  editarCargo(id: string, data: Partial<Cargo>): Observable<Cargo> {
    return this.http.put<Cargo>(`${this.baseUrl}/cargos/${id}`, data);
  }
  eliminarCargo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cargos/${id}`);
  }

  // --- Departamentos ---
  cargarDepartamentos(tenantId: string): Observable<Departamento[]> {
    return this.http.get<Departamento[]>(`${this.baseUrl}/departamentos/tenant/${tenantId}`).pipe(tap(d => this.departamentos.set(d)));
  }
  crearDepartamento(tenantId: string, data: Partial<Departamento>): Observable<Departamento> {
    return this.http.post<Departamento>(`${this.baseUrl}/departamentos/tenant/${tenantId}`, data);
  }
  editarDepartamento(id: string, data: Partial<Departamento>): Observable<Departamento> {
    return this.http.put<Departamento>(`${this.baseUrl}/departamentos/${id}`, data);
  }
  eliminarDepartamento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/departamentos/${id}`);
  }
  
  // --- Tenants ---
  actualizarTenant(id: string, data: Partial<TenantDTO>): Observable<TenantDTO> {
    return this.http.put<TenantDTO>(`${this.baseUrl}/tenants/${id}`, data);
  }

  // --- Helpers ---
  getUsuariosPorRol(tenantId: string, rol: string): Observable<UsuarioListDTO[]> {
    return this.http.get<UsuarioListDTO[]>(`${this.baseUrl}/usuarios/tenant/${tenantId}/rol/${rol}`);
  }
}

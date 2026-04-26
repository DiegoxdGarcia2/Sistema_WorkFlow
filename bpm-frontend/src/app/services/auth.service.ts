import { Injectable, signal, computed, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface UsuarioSesion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  nombre: string;
  email: string;
  departamentoId?: string;
  departamento?: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
}

export interface LoginRequest { email:  string; password: string; }
export interface RegistroEmpresaRequest { nombreEmpresa: string; nombreAdmin: string; email: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/auth';
  private readonly SESSION_VERSION = 'v1.4_cleanup'; // Incrementa esto para forzar logout masivo

  usuario = signal<UsuarioSesion | null>(this.cargarSesion());
  estaLogueado = computed(() => this.usuario() !== null);

  constructor(
    private http: HttpClient, 
    private router: Router,
    private injector: Injector
  ) {
    this.validarYLimpiarSesion();
    // Heartbeat cada 1 minuto para verificar expiración
    setInterval(() => {
      if (this.estaLogueado()) {
        const sesion = this.cargarSesion();
        if (!sesion) {
          console.warn('Sesión expirada detectada por Heartbeat.');
          this.logout();
        }
      }
    }, 60000);
  }

  private validarYLimpiarSesion(): void {
    const raw = localStorage.getItem('bpm_user');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.version !== this.SESSION_VERSION) {
        console.warn('LIMPIEZA FORZADA: Sesión incompatible detectada.');
        localStorage.clear(); // Limpia TODO para estar seguros
        this.usuario.set(null);
      }
    } catch (e) {
      localStorage.clear();
    }
  }

  login(req: LoginRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/login`, req).pipe(
      tap(user => { 
        this.usuario.set(user); 
        const sessionData = { ...user, loginAt: Date.now(), version: this.SESSION_VERSION };
        localStorage.setItem('bpm_user', JSON.stringify(sessionData)); 
      })
    );
  }

  registroEmpresa(req: RegistroEmpresaRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/registro-empresa`, req).pipe(
      tap(user => { 
        this.usuario.set(user); 
        const sessionData = { ...user, loginAt: Date.now(), version: this.SESSION_VERSION };
        localStorage.setItem('bpm_user', JSON.stringify(sessionData)); 
      })
    );
  }

  logout(): void {
    this.usuario.set(null);
    localStorage.removeItem('bpm_user');
    
    // Lazy injection to prevent circular dependencies
    import('./workflow.service').then(m => {
      try {
        const ws = this.injector.get(m.WorkflowService);
        ws.limpiarEstado();
      } catch (e) {
        // Ignore if not provided in root context yet
      }
    });
    
    this.router.navigate(['/login']);
  }

  private cargarSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem('bpm_user');
    if (!raw) return null;
    
    try {
      const data = JSON.parse(raw);
      const loginAt = data.loginAt || 0;
      const version = data.version;
      const ONE_HOUR = 60 * 60 * 1000;
      
      // Limpiar si la versión cambió o si expiró
      if (version !== this.SESSION_VERSION || Date.now() - loginAt > ONE_HOUR) {
        console.warn('Sesión incompatible o expirada. Limpiando...');
        localStorage.removeItem('bpm_user');
        return null;
      }
      
      return data;
    } catch (e) {
      return null;
    }
  }
}

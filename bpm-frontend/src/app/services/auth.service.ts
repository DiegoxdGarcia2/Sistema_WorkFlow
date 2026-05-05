import { Injectable, signal, computed, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface UsuarioSesion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  cargo?: string;
  departamentoId?: string;
  departamento?: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
  activo?: boolean;
  token: string; // JWT Bearer token
}

export interface LoginRequest { email:  string; password: string; }
export interface RegistroEmpresaRequest { nombreEmpresa: string; nombreAdmin: string; email: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/auth';
  private readonly SESSION_VERSION = 'v2.0_jwt'; // Fuerza re-login al migrar a JWT
  private readonly TOKEN_KEY = 'bpm_token';
  private readonly USER_KEY = 'bpm_user';
  private readonly LAST_ACTIVE_KEY = 'bpm_last_active';
  private readonly INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutos

  usuario = signal<UsuarioSesion | null>(this.cargarSesion());
  estaLogueado = computed(() => this.usuario() !== null && this.getToken() !== null);

  private lastActivityUpdate = 0;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private injector: Injector
  ) {
    this.validarYLimpiarSesion();
    this.checkInactivity();
    this.setupInactivityListeners();

    // Heartbeat cada 60s para detectar token expirado o inactividad
    setInterval(() => {
      this.checkInactivity();
      if (this.usuario()) {
        if (this.isTokenExpired()) {
          console.warn('⏰ Token JWT expirado. Cerrando sesión...');
          this.logout();
        }
      }
    }, 60000);
  }

  private setupInactivityListeners(): void {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, () => this.updateLastActiveTime()));
  }

  private updateLastActiveTime(): void {
    if (!this.usuario()) return;
    const now = Date.now();
    // Actualizar localStorage como máximo una vez cada 5 segundos para no afectar rendimiento
    if (now - this.lastActivityUpdate > 5000) {
      localStorage.setItem(this.LAST_ACTIVE_KEY, now.toString());
      this.lastActivityUpdate = now;
    }
  }

  private checkInactivity(): void {
    if (!this.usuario()) return;
    const lastActiveStr = localStorage.getItem(this.LAST_ACTIVE_KEY);
    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (Date.now() - lastActive > this.INACTIVITY_LIMIT_MS) {
        console.warn('⏰ Sesión expirada por inactividad (30 min). Cerrando sesión...');
        this.logout();
      }
    }
  }

  // ── Token Management ──────────────────────────────────────

  /** Retorna el JWT token almacenado o null */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /** Verifica si el token JWT ha expirado leyendo el payload */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000; // JWT exp es en segundos
      return Date.now() >= expiresAt;
    } catch {
      return true;
    }
  }

  /** Extrae el tenantId del JWT payload */
  getTenantIdFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.tenantId || null;
    } catch {
      return null;
    }
  }

  // ── Auth Operations ───────────────────────────────────────

  private validarYLimpiarSesion(): void {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.version !== this.SESSION_VERSION) {
        console.warn('🔄 LIMPIEZA FORZADA: Sesión pre-JWT detectada. Re-login requerido.');
        this.clearStorage();
        this.usuario.set(null);
      }
    } catch (e) {
      this.clearStorage();
    }
  }

  login(req: LoginRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/login`, req).pipe(
      tap(user => this.persistSession(user))
    );
  }

  registroEmpresa(req: RegistroEmpresaRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/registro-empresa`, req).pipe(
      tap(user => this.persistSession(user))
    );
  }

  logout(): void {
    this.usuario.set(null);
    this.clearStorage();
    
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

  // ── Private Helpers ───────────────────────────────────────

  private persistSession(user: UsuarioSesion): void {
    // Guardar token por separado (fácil acceso desde interceptor)
    if (user.token) {
      localStorage.setItem(this.TOKEN_KEY, user.token);
    }
    // Guardar datos de usuario (sin token, por seguridad)
    const sessionData = { ...user, token: undefined, loginAt: Date.now(), version: this.SESSION_VERSION };
    localStorage.setItem(this.USER_KEY, JSON.stringify(sessionData));
    localStorage.setItem(this.LAST_ACTIVE_KEY, Date.now().toString());
    // Actualizar signal (con token para uso inmediato)
    this.usuario.set(user);
  }

  private cargarSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem(this.USER_KEY);
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!raw || !token) return null;
    
    try {
      const data = JSON.parse(raw);
      const version = data.version;
      
      // Limpiar si la versión cambió
      if (version !== this.SESSION_VERSION) {
        this.clearStorage();
        return null;
      }

      // Verificar que el token no esté expirado
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= payload.exp * 1000) {
          console.warn('⏰ Token JWT expirado al cargar sesión.');
          this.clearStorage();
          return null;
        }
      } catch {
        this.clearStorage();
        return null;
      }
      
      return { ...data, token };
    } catch (e) {
      return null;
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.LAST_ACTIVE_KEY);
  }
}

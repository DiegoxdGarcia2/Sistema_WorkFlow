import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface UsuarioSesion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'DISENADOR' | 'FUNCIONARIO' | 'CLIENTE';
}

export interface LoginRequest { email:  string; password: string; }
export interface RegistroEmpresaRequest { nombreEmpresa: string; nombreAdmin: string; email: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/auth';

  usuario = signal<UsuarioSesion | null>(this.cargarSesion());
  estaLogueado = computed(() => this.usuario() !== null);

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/login`, req).pipe(
      tap(user => { this.usuario.set(user); localStorage.setItem('bpm_user', JSON.stringify(user)); })
    );
  }

  registroEmpresa(req: RegistroEmpresaRequest): Observable<UsuarioSesion> {
    return this.http.post<UsuarioSesion>(`${this.baseUrl}/registro-empresa`, req).pipe(
      tap(user => { this.usuario.set(user); localStorage.setItem('bpm_user', JSON.stringify(user)); })
    );
  }

  logout(): void {
    this.usuario.set(null);
    localStorage.removeItem('bpm_user');
    this.router.navigate(['/login']);
  }

  private cargarSesion(): UsuarioSesion | null {
    const raw = localStorage.getItem('bpm_user');
    return raw ? JSON.parse(raw) : null;
  }
}

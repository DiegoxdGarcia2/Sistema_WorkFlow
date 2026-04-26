import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-4 ring-1 ring-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white drop-shadow-sm">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">BPM Inteligente</h1>
          <p class="text-sm text-slate-500 mt-2 font-medium">Gestión Avanzada de Workflows</p>
        </div>

        <div class="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-2xl p-8 ring-1 ring-white/10">
          @if (error) {
            <div class="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {{ error }}
            </div>
          }
          <form (submit)="login(); $event.preventDefault()" class="space-y-6">
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Correo Electrónico</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input [(ngModel)]="email" name="email" type="email" placeholder="admin@cre.com" autocomplete="email" required
                       class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all hover:bg-slate-800">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'" placeholder="••••••••" autocomplete="current-password" required
                       class="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all hover:bg-slate-800">
                <button type="button" (click)="showPassword = !showPassword"
                        class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-300 transition-colors">
                  @if (showPassword) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88 10 10a2 2 0 0 0 2.82 2.82l.12.12"/><path d="M2 2l20 20"/><path d="M10.37 4.1a10.3 10.3 0 0 1 8.26 3.23"/><path d="M22 12c-1.66 2.49-4.38 5-7 5-.56 0-1.12-.11-1.66-.31"/><path d="M15 15.11l-1.42-1.42"/><path d="M2 12c1.66-2.49 4.38-5 7-5 1.55 0 3.03.86 4.31 2.22"/><path d="M7.85 11.23a2 2 0 0 0 2.92 2.92"/></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <button type="submit" [disabled]="cargando || !email || !password"
                    class="w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
              {{ cargando ? 'Verificando...' : 'Entrar al Sistema' }}
            </button>
          </form>
          <div class="mt-8 pt-6 border-t border-slate-800/50 text-center">
            <p class="text-sm text-slate-500 font-medium">¿Tu empresa no está registrada?
              <a routerLink="/registro" class="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors">Empieza aquí</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  cargando = false;
  showPassword = false;

  constructor(
    private auth: AuthService, 
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.auth.estaLogueado()) {
      this.redirigir();
    }
  }

  login(): void {
    if (!this.email || !this.password) return;
    this.cargando = true;
    this.error = '';
    this.cd.detectChanges();

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.redirigir();
        this.cd.detectChanges();
      },
      error: (err) => { 
        this.error = err.error?.message || 'Error de conexión con el servidor.'; 
        this.cargando = false; 
        this.cd.detectChanges();
        // Fallback to ensure change detection if the first one missed
        setTimeout(() => this.cd.detectChanges(), 150);
      },
    });
  }

  private redirigir(): void {
    const user = this.auth.usuario();
    if (!user) return;
    
    const rutas: Record<string, string> = {
      ADMINISTRADOR: '/admin', 
      DISENADOR: '/designer',
      FUNCIONARIO: '/funcionario', 
      CLIENTE: '/funcionario',
    };
    this.router.navigate([rutas[user.rol] || '/funcionario']);
  }
}

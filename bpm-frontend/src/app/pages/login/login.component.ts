import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-4">
            <span class="text-white text-3xl font-bold">⚡</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-white">BPM Inteligente</h1>
          <p class="text-sm text-slate-500 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        <!-- Card -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8">
          @if (error) {
            <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {{ error }}
            </div>
          }

          <div class="space-y-5">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Email</label>
              <input [(ngModel)]="email" type="email" placeholder="tu@empresa.com"
                     class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Contraseña</label>
              <input [(ngModel)]="password" type="password" placeholder="••••••••"
                     class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all">
            </div>
            <button (click)="login()" [disabled]="cargando"
                    class="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50">
              {{ cargando ? 'Ingresando...' : 'Iniciar Sesión' }}
            </button>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-slate-500">¿No tienes cuenta?
              <a routerLink="/registro" class="text-indigo-400 hover:text-indigo-300 font-semibold ml-1">Registra tu empresa</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  cargando = false;

  constructor(private auth: AuthService, private router: Router) {}

  login(): void {
    this.cargando = true;
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (user) => {
        const rutas: Record<string, string> = {
          ADMINISTRADOR: '/admin', DISENADOR: '/designer',
          FUNCIONARIO: '/funcionario', CLIENTE: '/funcionario',
        };
        this.router.navigate([rutas[user.rol] || '/funcionario']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Credenciales inválidas.';
        this.cargando = false;
      },
    });
  }
}

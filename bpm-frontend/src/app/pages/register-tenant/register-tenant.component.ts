import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-tenant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
            <span class="text-white text-3xl font-bold">🏢</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-white">Registra tu Empresa</h1>
          <p class="text-sm text-slate-500 mt-1">Crea tu workspace BPM en segundos</p>
        </div>

        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl p-8">
          @if (error) {
            <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{{ error }}</div>
          }
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Nombre de la Empresa</label>
              <input [(ngModel)]="nombreEmpresa" type="text" placeholder="Ej. Corporación Nacional S.A."
                     class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Tu Nombre Completo</label>
              <input [(ngModel)]="nombreAdmin" type="text" placeholder="Ej. Juan Carlos Pérez López"
                     class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Email Corporativo</label>
              <input [(ngModel)]="email" type="email" placeholder="Ej. admin@miempresa.com" autocomplete="email"
                     class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Contraseña</label>
              <div class="relative">
                <input [(ngModel)]="password" [type]="showPwd ? 'text' : 'password'" placeholder="Mínimo 6 caracteres" autocomplete="new-password"
                       class="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all">
                <button type="button" (click)="showPwd = !showPwd"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {{ showPwd ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            <button (click)="registrar()" [disabled]="cargando || !nombreEmpresa || !nombreAdmin || !email || !password"
                    class="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {{ cargando ? 'Creando...' : 'Crear Empresa y Cuenta' }}
            </button>
          </div>
          <div class="mt-6 text-center">
            <p class="text-sm text-slate-500">¿Ya tienes cuenta?
              <a routerLink="/login" class="text-indigo-400 hover:text-indigo-300 font-semibold ml-1">Inicia sesión</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterTenantComponent {
  nombreEmpresa = '';
  nombreAdmin = '';
  email = '';
  password = '';
  error = '';
  cargando = false;
  showPwd = false;

  constructor(private auth: AuthService, private router: Router) {}

  registrar(): void {
    this.cargando = true;
    this.error = '';
    this.auth.registroEmpresa({
      nombreEmpresa: this.nombreEmpresa, nombreAdmin: this.nombreAdmin,
      email: this.email, password: this.password,
    }).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (err) => { this.error = err.error?.message || 'Error al registrar.'; this.cargando = false; },
    });
  }
}

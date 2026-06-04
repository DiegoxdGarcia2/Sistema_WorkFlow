import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-client',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      <!-- Decoración de fondo -->
      <div class="absolute top-0 left-0 w-full h-full">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div class="w-full max-w-md relative z-10 animate-fade-in">
        <div class="text-center mb-10">
          <div class="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-sky-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-indigo-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
            ⚡
          </div>
          <h1 class="text-3xl font-bold text-white tracking-tight mb-2">Portal del Cliente</h1>
          <p class="text-slate-400 text-sm">Regístrate para ver y gestionar tus trámites</p>
        </div>

        <div class="glass p-8 rounded-3xl border border-slate-800 shadow-2xl">
          @if (errorMsg) {
            <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3 animate-shake">
              <span>⚠️</span> {{ errorMsg }}
            </div>
          }

          @if (successMsg) {
            <div class="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
              <span>✅</span> {{ successMsg }}
            </div>
          }

          <form (submit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Documento de Identidad (CI)</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🪪</span>
                <input [(ngModel)]="ci" name="ci" type="text" required
                       class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                       placeholder="Tu CI registrado">
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">📧</span>
                <input [(ngModel)]="email" name="email" type="email" required
                       class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                       placeholder="ejemplo@correo.com">
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nueva Contraseña</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔒</span>
                <input [(ngModel)]="password" name="password" type="password" required
                       class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                       placeholder="••••••••">
              </div>
            </div>

            <button type="submit" [disabled]="loading"
                    class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0">
              {{ loading ? 'Registrando...' : 'Completar Registro' }}
            </button>
          </form>

          <div class="mt-8 pt-8 border-t border-slate-800 text-center">
            <p class="text-slate-500 text-xs">
              ¿Ya tienes cuenta? 
              <a routerLink="/login" class="text-indigo-400 font-bold hover:text-indigo-300 transition-colors ml-1">Inicia Sesión</a>
            </p>
          </div>
        </div>

        <p class="text-center mt-10 text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">
          BPM Inteligente · Secure Portal
        </p>
      </div>
    </div>
  `,
  styles: [`
    .glass {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(20px);
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .animate-shake {
      animation: shake 0.2s ease-in-out 0s 2;
    }
  `]
})
export class RegisterClientComponent {
  ci = '';
  email = '';
  password = '';
  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.ci || !this.email || !this.password) {
      this.errorMsg = 'Por favor, completa todos los campos.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.auth.registroCliente({ ci: this.ci, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.successMsg = '¡Registro exitoso! Redirigiendo a tu portal...';
        setTimeout(() => this.router.navigate(['/portal-cliente']), 2000);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Error al registrarse. Verifica tus datos e intenta de nuevo.';
        this.loading = false;
      }
    });
  }
}

import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.estaLogueado()) {
      <div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <nav class="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
          <div class="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span class="text-white text-lg font-bold">⚡</span>
              </div>
              <div>
                <span class="text-sm font-bold tracking-tight">BPM Inteligente</span>
                <p class="text-[10px] text-slate-500 uppercase tracking-widest">Motor de Workflows</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              @if (auth.usuario()?.rol === 'ADMINISTRADOR') {
                <a routerLink="/admin" routerLinkActive="bg-red-500/15 text-red-400"
                   class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                  🛡️ Admin
                </a>
              }
              @if (auth.usuario()?.rol === 'ADMINISTRADOR' || auth.usuario()?.rol === 'DISENADOR') {
                <a routerLink="/designer" routerLinkActive="bg-indigo-500/15 text-indigo-400"
                   class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                  🎨 Diseñador
                </a>
              }
              <a routerLink="/funcionario" routerLinkActive="bg-indigo-500/15 text-indigo-400"
                 class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                📋 Funcionario
              </a>
              <a routerLink="/tracking" routerLinkActive="bg-sky-500/15 text-sky-400"
                 class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
                📍 Tracking
              </a>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <p class="text-xs font-semibold">{{ auth.usuario()?.nombre }}</p>
                <p class="text-[10px] text-slate-500">{{ auth.usuario()?.tenantNombre }}</p>
              </div>
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-indigo-500/20">
                {{ auth.usuario()?.nombre?.charAt(0) }}
              </div>
              <button (click)="auth.logout()"
                      class="ml-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Cerrar sesión">
                🚪
              </button>
            </div>
          </div>
        </nav>
        <router-outlet />
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class App {
  constructor(public auth: AuthService) {}
}

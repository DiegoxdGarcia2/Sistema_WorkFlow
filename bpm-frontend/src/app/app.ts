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
                   class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
                  Admin
                </a>
              }
              @if (auth.usuario()?.rol === 'ADMINISTRADOR' || auth.usuario()?.rol === 'DISENADOR') {
                <a routerLink="/designer" routerLinkActive="bg-indigo-500/15 text-indigo-400"
                   class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.707-.484 2.103-1.206.35-.64.032-1.404-.603-1.794A2.001 2.001 0 0 1 12.5 15.5H13c1.933 0 3.5-1.567 3.5-3.5 0-.585-.143-1.135-.395-1.619.347-.39.757-.704 1.218-.916A4.5 4.5 0 0 0 12 2z"/></svg>
                  Diseñador
                </a>
              }
              <a routerLink="/funcionario" routerLinkActive="bg-indigo-500/15 text-indigo-400"
                 class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>
                Funcionario
              </a>
              <a routerLink="/tracking" routerLinkActive="bg-sky-500/15 text-sky-400"
                 class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                Tracking
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
                      class="ml-2 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Cerrar sesión">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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

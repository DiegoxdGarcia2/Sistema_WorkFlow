import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <!-- Navbar -->
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
            <a routerLink="/designer" routerLinkActive="bg-indigo-500/15 text-indigo-400"
               class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
              🎨 Diseñador
            </a>
            <a routerLink="/funcionario" routerLinkActive="bg-indigo-500/15 text-indigo-400"
               class="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all">
              📋 Funcionario
            </a>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-xs font-semibold">Admin BPM</p>
              <p class="text-[10px] text-slate-500">Tenant Demo</p>
            </div>
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-indigo-500/20">
              A
            </div>
          </div>
        </div>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [],
})
export class App {
  title = 'BPM Inteligente';
}

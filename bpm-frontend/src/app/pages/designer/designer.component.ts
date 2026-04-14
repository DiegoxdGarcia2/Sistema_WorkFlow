import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO } from '../../models/bpm.models';

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- Sidebar: Lista de Políticas -->
      <aside class="w-72 border-r border-slate-800 bg-slate-900/50 p-5 overflow-y-auto">
        <div class="mb-6">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Políticas de Negocio
          </h2>
          <button (click)="cargarPoliticas()"
                  class="w-full px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
            🔄 Recargar
          </button>
        </div>

        @if (politicaService.politicas().length === 0) {
          <div class="text-center py-8">
            <p class="text-sm text-slate-500">No hay políticas creadas.</p>
            <p class="text-xs text-slate-600 mt-1">Usa la API para crear una.</p>
          </div>
        }

        @for (politica of politicaService.politicas(); track politica.id) {
          <div (click)="seleccionar(politica)"
               class="p-4 mb-2 rounded-xl border transition-all duration-200 cursor-pointer"
               [class]="politicaSeleccionada?.id === politica.id
                 ? 'border-indigo-500/40 bg-indigo-500/10'
                 : 'border-slate-800 bg-slate-800/30 hover:border-slate-700 hover:bg-slate-800/50'">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-semibold text-slate-200 truncate">{{ politica.nombre }}</h3>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    [class]="politica.estaActiva
                      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                      : 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20'">
                {{ politica.estaActiva ? 'Activa' : 'Borrador' }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500">
              v{{ politica.version }} · {{ politica.calles.length }} calles · {{ politica.transiciones.length }} transiciones
            </p>
          </div>
        }
      </aside>

      <!-- Canvas principal -->
      <main class="flex-1 relative bg-slate-950">
        @if (politicaSeleccionada) {
          <!-- Toolbar -->
          <div class="absolute top-0 left-0 right-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200">
                📐 {{ politicaSeleccionada.nombre }}
              </span>
              <span class="text-xs text-slate-500">v{{ politicaSeleccionada.version }}</span>
            </div>
            <div class="flex gap-2">
              <button class="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
                Guardar
              </button>
              <button class="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
                Publicar
              </button>
            </div>
          </div>

          <!-- Grafo visual -->
          <div class="pt-16 p-8 h-full overflow-auto">
            <div class="grid gap-4">
              @for (calle of politicaSeleccionada.calles; track calle.id) {
                <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                  <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                    🏢 {{ calle.nombre }}
                  </h3>
                  <div class="flex flex-wrap gap-3">
                    @for (act of calle.actividades; track act.id) {
                      <div class="px-4 py-3 rounded-xl border text-sm font-medium transition-all"
                           [class]="getActividadClasses(act.tipo)">
                        <span class="mr-1.5">{{ getActividadIcon(act.tipo) }}</span>
                        {{ act.nombre }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Transiciones -->
            @if (politicaSeleccionada.transiciones.length > 0) {
              <div class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  🔗 Transiciones
                </h3>
                <div class="space-y-2">
                  @for (t of politicaSeleccionada.transiciones; track t.id) {
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                      <span class="font-mono bg-slate-800 px-2 py-0.5 rounded">{{ t.origenId | slice:0:8 }}</span>
                      <span>→</span>
                      <span class="font-mono bg-slate-800 px-2 py-0.5 rounded">{{ t.destinoId | slice:0:8 }}</span>
                      <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            [class]="t.tipoRuta === 'SECUENCIAL' ? 'bg-blue-500/10 text-blue-400' :
                                     t.tipoRuta === 'CONDICIONAL' ? 'bg-amber-500/10 text-amber-400' :
                                     'bg-purple-500/10 text-purple-400'">
                        {{ t.tipoRuta }}
                      </span>
                      @if (t.etiqueta) {
                        <span class="text-slate-500 italic">{{ t.etiqueta }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <p class="text-4xl mb-4">🖱️</p>
              <p class="text-sm text-slate-500 font-medium">Selecciona una política de la barra lateral</p>
              <p class="text-xs text-slate-600 mt-1">o crea una nueva desde la API</p>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class DesignerComponent implements OnInit {
  politicaSeleccionada: PoliticaDTO | null = null;

  constructor(public politicaService: PoliticaService) {}

  ngOnInit(): void {
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    this.politicaService.listarPorTenant('tenant-demo-001').subscribe();
  }

  seleccionar(politica: PoliticaDTO): void {
    this.politicaSeleccionada = politica;
  }

  getActividadIcon(tipo: string): string {
    const icons: Record<string, string> = {
      INICIO: '🟢', FIN: '🔴', TAREA: '📄',
      DECISION: '🔶', FORK: '🔀', JOIN: '🔁', MERGE: '🔃',
    };
    return icons[tipo] || '⬜';
  }

  getActividadClasses(tipo: string): string {
    const base = 'border-slate-700 bg-slate-800/60 text-slate-200';
    const classes: Record<string, string> = {
      INICIO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
      FIN: 'border-red-500/30 bg-red-500/10 text-red-400',
      DECISION: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
      FORK: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
      JOIN: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    };
    return classes[tipo] || base;
  }
}

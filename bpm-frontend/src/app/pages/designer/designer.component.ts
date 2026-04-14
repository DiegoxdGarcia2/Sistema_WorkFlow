import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- Sidebar: Lista de Políticas -->
      <aside class="w-72 border-r border-slate-800 bg-slate-900/50 p-5 overflow-y-auto">
        <div class="mb-6">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Políticas de Negocio
          </h2>
          <button (click)="mostrarModalCrear = true"
                  class="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all mb-2">
            + Crear Política
          </button>
          <button (click)="cargarPoliticas()"
                  class="w-full px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
            🔄 Recargar
          </button>
        </div>

        @if (politicaService.politicas().length === 0) {
          <div class="text-center py-8">
            <p class="text-4xl mb-3">📐</p>
            <p class="text-sm text-slate-500">No hay políticas creadas.</p>
            <p class="text-xs text-slate-600 mt-1">Crea tu primer flujo de trabajo.</p>
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
              v{{ politica.version }} · {{ politica.calles.length }} calles · {{ politica.transiciones.length }} trans.
            </p>
          </div>
        }
      </aside>

      <!-- Canvas principal -->
      <main class="flex-1 relative bg-slate-950">
        @if (politicaSeleccionada) {
          <div class="absolute top-0 left-0 right-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200">
                📐 {{ politicaSeleccionada.nombre }}
              </span>
              <span class="text-xs text-slate-500">v{{ politicaSeleccionada.version }}</span>
            </div>
          </div>

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

            @if (politicaSeleccionada.transiciones.length > 0) {
              <div class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">🔗 Transiciones</h3>
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
              <p class="text-xs text-slate-600 mt-1">o crea una nueva</p>
            </div>
          </div>
        }
      </main>

      <!-- MODAL CREAR POLÍTICA -->
      @if (mostrarModalCrear) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
            <h3 class="text-lg font-bold mb-4">Crear Nueva Política</h3>
            @if (errorModal) {
              <div class="mb-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{{ errorModal }}</div>
            }
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Nombre</label>
                <input [(ngModel)]="nuevaPolitica.nombre" placeholder="Ej. Aprobación de Créditos"
                       class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
                <textarea [(ngModel)]="nuevaPolitica.descripcion" rows="3" placeholder="Describe el flujo de trabajo..."
                          class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"></textarea>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="mostrarModalCrear = false; errorModal = ''" class="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="crearPolitica()" class="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">Crear</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DesignerComponent implements OnInit {
  politicaSeleccionada: PoliticaDTO | null = null;
  mostrarModalCrear = false;
  errorModal = '';
  nuevaPolitica = { nombre: '', descripcion: '' };

  constructor(public politicaService: PoliticaService, private auth: AuthService) {}

  ngOnInit(): void {
    this.cargarPoliticas();
  }

  cargarPoliticas(): void {
    const tenantId = this.auth.usuario()?.tenantId;
    if (tenantId) {
      this.politicaService.listarPorTenant(tenantId).subscribe();
    }
  }

  seleccionar(politica: PoliticaDTO): void {
    this.politicaSeleccionada = politica;
  }

  crearPolitica(): void {
    this.errorModal = '';
    const tenantId = this.auth.usuario()?.tenantId;
    if (!tenantId) return;

    this.politicaService.crear({
      tenantId: tenantId,
      nombre: this.nuevaPolitica.nombre,
      descripcion: this.nuevaPolitica.descripcion,
    }).subscribe({
      next: () => {
        this.mostrarModalCrear = false;
        this.nuevaPolitica = { nombre: '', descripcion: '' };
        this.cargarPoliticas();
      },
      error: (err) => this.errorModal = err.error?.message || 'Error al crear política.',
    });
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

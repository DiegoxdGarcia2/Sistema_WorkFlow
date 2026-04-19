import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { TrackingDTO, PasoTimeline } from '../../models/bpm.models';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <!-- Hero Header -->
      <div class="relative overflow-hidden border-b border-slate-800">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5"></div>
        <div class="relative max-w-4xl mx-auto px-6 py-12 text-center">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-2xl shadow-2xl shadow-indigo-500/20 mb-5">
            📍
          </div>
          <h1 class="text-3xl font-bold tracking-tight mb-2">Portal de Seguimiento</h1>
          <p class="text-sm text-slate-400 max-w-md mx-auto">Rastrea el estado de tu trámite en tiempo real. Ingresa el ID proporcionado por tu institución.</p>
        </div>
      </div>

      <!-- Search Section -->
      <div class="max-w-4xl mx-auto px-6 -mt-5">
        <div class="flex gap-3 p-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl">
          <input [(ngModel)]="searchId"
                 (keydown.enter)="buscarTramite()"
                 placeholder="Ingresa el ID de tu trámite..."
                 class="flex-1 px-5 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono">
          <button (click)="buscarTramite()"
                  class="px-8 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-sky-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all whitespace-nowrap">
            🔍 Buscar
          </button>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-6 py-8">
        <!-- Loading State -->
        @if (cargando) {
          <div class="text-center py-16">
            <div class="w-12 h-12 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin mx-auto mb-4"></div>
            <p class="text-sm text-slate-500">Buscando trámite...</p>
          </div>
        }

        <!-- Error State -->
        @if (errorMsg) {
          <div class="mt-6 p-5 rounded-2xl bg-red-500/5 border border-red-500/20 text-center">
            <p class="text-3xl mb-3">🔍</p>
            <p class="text-sm font-semibold text-red-400">{{ errorMsg }}</p>
            <p class="text-xs text-slate-500 mt-1">Verifica que el ID sea correcto e intenta nuevamente.</p>
          </div>
        }

        <!-- Tracking Result -->
        @if (tracking && !cargando) {
          <!-- Tramite Info Card -->
          <div class="mb-8 p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Trámite</p>
                <h2 class="text-xl font-bold text-slate-100">{{ tracking.tramite.politicaNombre }}</h2>
                <p class="font-mono text-xs text-slate-500 mt-1">ID: {{ tracking.tramite.id }}</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset"
                      [class]="getEstadoTramiteClasses(tracking.tramite.estado)">
                  <span class="w-2 h-2 rounded-full" [class]="getEstadoDot(tracking.tramite.estado)"></span>
                  {{ getEstadoLabel(tracking.tramite.estado) }}
                </span>
                <p class="text-[10px] text-slate-500 mt-2">Iniciado: {{ tracking.tramite.iniciadoEn | date:'dd MMM yyyy, HH:mm' }}</p>
                @if (tracking.tramite.finalizadoEn) {
                  <p class="text-[10px] text-emerald-400">Finalizado: {{ tracking.tramite.finalizadoEn | date:'dd MMM yyyy, HH:mm' }}</p>
                }
              </div>
            </div>
            <!-- Progress bar -->
            <div class="mt-5">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Progreso</span>
                <span class="text-xs font-bold text-indigo-400">{{ calcularProgreso() }}%</span>
              </div>
              <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
                     [style.width.%]="calcularProgreso()"></div>
              </div>
            </div>
          </div>

          <!-- Timeline -->
          <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
            📋 Línea de Tiempo
          </h3>

          @if (tracking.timeline.length === 0) {
            <div class="text-center py-12 rounded-2xl border border-dashed border-slate-700 bg-slate-900/30">
              <p class="text-3xl mb-3">⏳</p>
              <p class="text-sm text-slate-500">Aún no hay actividad registrada para este trámite.</p>
            </div>
          }

          <div class="relative">
            <!-- Vertical line -->
            <div class="absolute left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-500/40 via-slate-700 to-slate-800"></div>

            @for (paso of tracking.timeline; track paso.registroId; let i = $index; let last = $last) {
              <div class="relative flex gap-5 mb-1" [class]="last ? '' : 'pb-6'">
                <!-- Timeline dot -->
                <div class="relative z-10 flex-shrink-0">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-lg"
                       [class]="getTimelineDotClasses(paso.estado)">
                    {{ getTimelineIcon(paso.estado) }}
                  </div>
                </div>

                <!-- Content card -->
                <div class="flex-1 p-4 rounded-xl border transition-all"
                     [class]="getTimelineCardClasses(paso.estado)">
                  <div class="flex items-start justify-between mb-2">
                    <div>
                      <h4 class="text-sm font-bold text-slate-200">{{ paso.actividadNombre }}</h4>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 ring-1 ring-slate-700">
                          🏢 {{ paso.calleNombre }}
                        </span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              [class]="getEstadoPasoClasses(paso.estado)">
                          {{ paso.estado }}
                        </span>
                      </div>
                    </div>
                    <div class="text-right text-[10px] text-slate-500 flex-shrink-0 ml-4">
                      @if (paso.asignadoEn) {
                        <p>Asignado: {{ paso.asignadoEn | date:'dd/MM/yy HH:mm' }}</p>
                      }
                      @if (paso.completadoEn) {
                        <p class="text-emerald-400/80">✓ {{ paso.completadoEn | date:'dd/MM/yy HH:mm' }}</p>
                      }
                    </div>
                  </div>
                  @if (paso.notas) {
                    <div class="mt-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                      <p class="text-xs text-slate-400 italic">"{{ paso.notas }}"</p>
                    </div>
                  }
                  @if (paso.ejecutadoPor) {
                    <p class="text-[10px] text-slate-600 mt-2">Atendido por: {{ paso.ejecutadoPor }}</p>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty default state -->
        @if (!tracking && !cargando && !errorMsg) {
          <div class="text-center py-16">
            <p class="text-5xl mb-4">📦</p>
            <p class="text-sm text-slate-500 font-medium">Ingresa un ID de trámite para ver su seguimiento</p>
            <p class="text-xs text-slate-600 mt-1">El ID fue proporcionado cuando se inició tu solicitud.</p>
          </div>
        }
      </div>

      <!-- Footer -->
      <div class="border-t border-slate-800 mt-8">
        <div class="max-w-4xl mx-auto px-6 py-6 text-center">
          <p class="text-xs text-slate-600">BPM Inteligente · Portal de Seguimiento para Clientes</p>
        </div>
      </div>
    </div>
  `,
})
export class TrackingComponent {
  searchId = '';
  tracking: TrackingDTO | null = null;
  cargando = false;
  errorMsg = '';

  constructor(
    private workflowService: WorkflowService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Si viene con un id en la ruta, buscarlo automáticamente
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.searchId = idParam;
      this.buscarTramite();
    }
  }

  buscarTramite(): void {
    const id = this.searchId.trim();
    if (!id) return;

    this.cargando = true;
    this.errorMsg = '';
    this.tracking = null;

    this.workflowService.getTracking(id).subscribe({
      next: (data) => {
        this.tracking = data;
        this.cargando = false;
      },
      error: (err) => {
        this.errorMsg = err.status === 404
          ? 'No se encontró un trámite con ese ID.'
          : 'Error al buscar el trámite. Intenta nuevamente.';
        this.cargando = false;
      },
    });
  }

  calcularProgreso(): number {
    if (!this.tracking || this.tracking.timeline.length === 0) return 0;
    if (this.tracking.tramite.estado === 'COMPLETADO') return 100;
    const hechos = this.tracking.timeline.filter(p => p.estado === 'HECHO').length;
    return Math.round((hechos / this.tracking.timeline.length) * 100);
  }

  // ── Styling Helpers ──────────────────────────────────────────

  getEstadoTramiteClasses(estado: string): string {
    const m: Record<string, string> = {
      INICIADO: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
      EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
      COMPLETADO: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      CANCELADO: 'bg-red-500/10 text-red-400 ring-red-500/20',
    };
    return m[estado] || m['INICIADO'];
  }

  getEstadoDot(estado: string): string {
    const m: Record<string, string> = {
      INICIADO: 'bg-blue-400',
      EN_PROGRESO: 'bg-amber-400 animate-pulse',
      COMPLETADO: 'bg-emerald-400',
      CANCELADO: 'bg-red-400',
    };
    return m[estado] || 'bg-slate-400';
  }

  getEstadoLabel(estado: string): string {
    const m: Record<string, string> = {
      INICIADO: 'Iniciado',
      EN_PROGRESO: 'En Progreso',
      COMPLETADO: 'Completado',
      CANCELADO: 'Cancelado',
    };
    return m[estado] || estado;
  }

  getTimelineDotClasses(estado: string): string {
    const m: Record<string, string> = {
      HECHO: 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30',
      EN_PROGRESO: 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30 animate-pulse',
      PENDIENTE: 'bg-slate-800 text-slate-500 ring-2 ring-slate-700',
      BLOQUEADO: 'bg-orange-500/20 text-orange-400 ring-2 ring-orange-500/30',
    };
    return m[estado] || m['PENDIENTE'];
  }

  getTimelineIcon(estado: string): string {
    const m: Record<string, string> = {
      HECHO: '✅',
      EN_PROGRESO: '⏳',
      PENDIENTE: '⏸️',
      BLOQUEADO: '🚫',
    };
    return m[estado] || '⬜';
  }

  getTimelineCardClasses(estado: string): string {
    const m: Record<string, string> = {
      HECHO: 'border-emerald-500/20 bg-emerald-500/[0.03]',
      EN_PROGRESO: 'border-amber-500/20 bg-amber-500/[0.03]',
      PENDIENTE: 'border-slate-800 bg-slate-900/40',
      BLOQUEADO: 'border-orange-500/20 bg-orange-500/[0.03]',
    };
    return m[estado] || m['PENDIENTE'];
  }

  getEstadoPasoClasses(estado: string): string {
    const m: Record<string, string> = {
      HECHO: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
      EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
      PENDIENTE: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
      BLOQUEADO: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',
    };
    return m[estado] || m['PENDIENTE'];
  }
}

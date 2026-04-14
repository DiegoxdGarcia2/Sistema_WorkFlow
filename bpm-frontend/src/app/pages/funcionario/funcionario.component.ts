import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { RegistroActividadDTO, CompletarTareaRequest } from '../../models/bpm.models';

@Component({
  selector: 'app-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div class="px-5 pt-6 pb-4">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Panel del Funcionario
          </h2>
        </div>
        <nav class="flex-1 px-3">
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1">
            📥 Bandeja de Tareas
          </a>
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent mb-1">
            📊 Trámites
          </a>
          <a class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent">
            ⚙️ Configuración
          </a>
        </nav>
        <div class="p-4 mx-3 mb-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div class="flex items-start gap-3">
            <span class="text-lg">❓</span>
            <div>
              <p class="text-xs font-semibold text-slate-200">¿Necesitas ayuda?</p>
              <p class="text-[10px] text-slate-500 mt-0.5">Consulta la documentación.</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-8 overflow-y-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-bold tracking-tight">Panel del Funcionario</h1>
          <p class="text-sm text-slate-400 mt-1">Gestiona tus tareas pendientes.</p>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xl shadow-lg">📋</div>
            <div>
              <p class="text-2xl font-bold">{{ workflowService.tareasPendientes().length }}</p>
              <p class="text-xs text-slate-500">Tareas Pendientes</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-xl shadow-lg">⏳</div>
            <div>
              <p class="text-2xl font-bold">{{ contarEnProgreso() }}</p>
              <p class="text-xs text-slate-500">En Progreso</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-xl shadow-lg">✅</div>
            <div>
              <p class="text-2xl font-bold">{{ contarHechos() }}</p>
              <p class="text-xs text-slate-500">Completadas Hoy</p>
            </div>
          </div>
        </div>

        <!-- Tabla de Tareas -->
        <h2 class="text-lg font-semibold mb-4">Tareas Asignadas</h2>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-800/40">
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actividad</th>
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Trámite</th>
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              @if (workflowService.tareasPendientes().length === 0) {
                <tr>
                  <td colspan="5" class="px-5 py-12 text-center text-slate-500 text-sm">
                    No hay tareas pendientes. 🎉
                  </td>
                </tr>
              }
              @for (tarea of workflowService.tareasPendientes(); track tarea.id) {
                <tr class="hover:bg-indigo-500/[0.03] transition-colors">
                  <td class="px-5 py-3.5 font-semibold text-slate-200">{{ tarea.actividadNombre }}</td>
                  <td class="px-5 py-3.5">
                    <span class="font-mono text-xs text-slate-500">{{ tarea.tramiteId | slice:0:8 }}…</span>
                  </td>
                  <td class="px-5 py-3.5">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset"
                          [class]="getEstadoClasses(tarea.estado)">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="getEstadoDot(tarea.estado)"></span>
                      {{ tarea.estado }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-slate-400 text-xs">{{ tarea.asignadoEn | date:'dd MMM yyyy' }}</td>
                  <td class="px-5 py-3.5">
                    @if (tarea.estado === 'PENDIENTE') {
                      <button (click)="tomarTarea(tarea)"
                              class="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all">
                        Tomar
                      </button>
                    }
                    @if (tarea.estado === 'EN_PROGRESO') {
                      <button (click)="abrirFormulario(tarea)"
                              class="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all">
                        Completar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (workflowService.tareasPendientes().length > 0) {
            <div class="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-800/20">
              <span class="text-xs text-slate-500">{{ workflowService.tareasPendientes().length }} registros</span>
            </div>
          }
        </div>

        <!-- Modal Completar Tarea -->
        @if (tareaActiva) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
              <h3 class="text-lg font-bold mb-1">Completar: {{ tareaActiva.actividadNombre }}</h3>
              <p class="text-xs text-slate-500 mb-6">Completa el formulario y envía los datos.</p>

              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Observaciones</label>
                  <textarea [(ngModel)]="formularioNotas" rows="3"
                            class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Escribe tus observaciones..."></textarea>
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <button (click)="tareaActiva = null"
                        class="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
                  Cancelar
                </button>
                <button (click)="completarTarea()"
                        class="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
                  ✓ Completar y Derivar
                </button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class FuncionarioComponent implements OnInit {
  private readonly userId = 'user-funcionario-001';
  tareaActiva: RegistroActividadDTO | null = null;
  formularioNotas = '';

  constructor(public workflowService: WorkflowService) {}

  ngOnInit(): void {
    this.workflowService.cargarBandejaPendientes(this.userId).subscribe();
  }

  contarEnProgreso(): number {
    return this.workflowService.tareasPendientes().filter(t => t.estado === 'EN_PROGRESO').length;
  }

  contarHechos(): number {
    return this.workflowService.tareasPendientes().filter(t => t.estado === 'HECHO').length;
  }

  tomarTarea(tarea: RegistroActividadDTO): void {
    this.workflowService.tomarTarea(tarea.id, this.userId).subscribe(() => {
      this.workflowService.cargarBandejaPendientes(this.userId).subscribe();
    });
  }

  abrirFormulario(tarea: RegistroActividadDTO): void {
    this.tareaActiva = tarea;
    this.formularioNotas = '';
  }

  /**
   * Completa la tarea → backend ejecuta derivar() → recarga la bandeja.
   */
  completarTarea(): void {
    if (!this.tareaActiva) return;

    const request: CompletarTareaRequest = {
      registroId: this.tareaActiva.id,
      esquemaFormulario: { campos: [{ nombre: 'observacion', tipo: 'texto', requerido: true }] },
      datosFormulario: { observacion: this.formularioNotas },
      notas: this.formularioNotas,
    };

    this.workflowService.completarTarea(request, this.userId).subscribe(() => {
      this.tareaActiva = null;
      this.formularioNotas = '';
    });
  }

  getEstadoClasses(estado: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'bg-slate-500/10 text-slate-400 ring-slate-500/20',
      EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
      HECHO: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      BLOQUEADO: 'bg-orange-500/10 text-orange-400 ring-orange-500/20',
    };
    return m[estado] || m['PENDIENTE'];
  }

  getEstadoDot(estado: string): string {
    const m: Record<string, string> = {
      PENDIENTE: 'bg-slate-400',
      EN_PROGRESO: 'bg-amber-400 animate-pulse',
      HECHO: 'bg-emerald-400',
      BLOQUEADO: 'bg-orange-400',
    };
    return m[estado] || m['PENDIENTE'];
  }
}

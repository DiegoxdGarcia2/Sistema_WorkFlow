import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { PoliticaService } from '../../services/politica.service';
import {
  RegistroActividadDTO,
  CompletarTareaRequest,
  PoliticaDTO,
  TramiteDTO,
} from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';

interface CampoReporte {
  nombre: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'email' | 'booleano' | 'textarea';
  valor: any;
}

@Component({
  selector: 'app-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; height: calc(100vh - 4rem); }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .toast { animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
  template: `
    <div class="flex h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">

      <!-- ══════════ SIDEBAR ══════════ -->
      <aside class="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div class="px-5 pt-6 pb-4">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Panel del Funcionario</h2>
        </div>
        <nav class="flex-1 px-3">
          <a (click)="vistaActiva = 'bandeja'" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer mb-1 transition-all"
             [class]="vistaActiva === 'bandeja' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            📥 Mis Tareas
          </a>
          <a (click)="vistaActiva = 'disponible'; cargarNoAsignadas()" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer mb-1 transition-all"
             [class]="vistaActiva === 'disponible' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            🔔 Tareas Disponibles
          </a>
          <a (click)="vistaActiva = 'tramites'; cargarTramites()" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer mb-1 transition-all"
             [class]="vistaActiva === 'tramites' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            📊 Trámites
          </a>
          <a (click)="vistaActiva = 'iniciar'; cargarPoliticasActivas()" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer mb-1 transition-all"
             [class]="vistaActiva === 'iniciar' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'">
            🚀 Iniciar Trámite
          </a>
        </nav>
        <div class="p-4 mx-3 mb-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div class="flex items-start gap-3">
            <span class="text-lg">👤</span>
            <div>
              <p class="text-xs font-semibold text-slate-200 truncate">{{ auth.usuario()?.nombre }}</p>
              <p class="text-[10px] text-slate-500 mt-0.5">{{ auth.usuario()?.email }}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- ══════════ MAIN CONTENT ══════════ -->
      <main class="flex-1 p-8 overflow-y-auto scrollbar-hide relative">

        <!-- ── Stats Row ── -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold tracking-tight mb-1">
            @if (vistaActiva === 'bandeja') { Mis Tareas }
            @if (vistaActiva === 'disponible') { Tareas Disponibles }
            @if (vistaActiva === 'tramites') { Gestión de Trámites }
            @if (vistaActiva === 'iniciar') { Iniciar Nuevo Trámite }
          </h1>
          <p class="text-sm text-slate-500">
            @if (vistaActiva === 'bandeja') { Tareas asignadas a ti (pendientes y en progreso). }
            @if (vistaActiva === 'disponible') { Tareas sin asignar que puedes tomar. }
            @if (vistaActiva === 'tramites') { Todos los trámites en progreso del tenant. }
            @if (vistaActiva === 'iniciar') { Selecciona una política activa para generar un nuevo trámite. }
          </p>
        </div>

        @if (vistaActiva === 'bandeja' || vistaActiva === 'disponible') {
          <div class="grid grid-cols-3 gap-4 mb-8">
            <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-xl shadow-lg">📋</div>
              <div><p class="text-2xl font-bold">{{ contarPorEstado('PENDIENTE') }}</p><p class="text-xs text-slate-500">Pendientes</p></div>
            </div>
            <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center text-xl shadow-lg">⏳</div>
              <div><p class="text-2xl font-bold">{{ contarPorEstado('EN_PROGRESO') }}</p><p class="text-xs text-slate-500">En Progreso</p></div>
            </div>
            <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center text-xl shadow-lg">✅</div>
              <div><p class="text-2xl font-bold">{{ contarPorEstado('HECHO') }}</p><p class="text-xs text-slate-500">Completadas</p></div>
            </div>
          </div>
        }

        <!-- ══════════ VISTA: MIS TAREAS ══════════ -->
        @if (vistaActiva === 'bandeja') {
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
                  <tr><td colspan="5" class="px-5 py-12 text-center text-slate-500 text-sm">No tienes tareas asignadas. 🎉</td></tr>
                }
                @for (tarea of workflowService.tareasPendientes(); track tarea.id) {
                  <tr class="hover:bg-indigo-500/[0.03] transition-colors">
                    <td class="px-5 py-3.5 font-semibold text-slate-200">{{ tarea.actividadNombre }}</td>
                    <td class="px-5 py-3.5"><span class="font-mono text-xs text-slate-500">{{ tarea.tramiteId | slice:0:8 }}…</span></td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset" [class]="getEstadoClasses(tarea.estado)">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="getEstadoDot(tarea.estado)"></span>{{ tarea.estado }}
                      </span>
                    </td>
                    <td class="px-5 py-3.5 text-slate-400 text-xs">{{ tarea.asignadoEn | date:'dd MMM yyyy HH:mm' }}</td>
                    <td class="px-5 py-3.5">
                      @if (tarea.estado === 'PENDIENTE') {
                        <button (click)="tomarTarea(tarea)" class="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all">Tomar</button>
                      }
                      @if (tarea.estado === 'EN_PROGRESO') {
                        <button (click)="abrirFormulario(tarea)" class="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-all">Completar</button>
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
        }

        <!-- ══════════ VISTA: TAREAS DISPONIBLES (sin asignar) ══════════ -->
        @if (vistaActiva === 'disponible') {
          <div class="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-800 bg-slate-800/40">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actividad</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Trámite</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                @if (workflowService.tareasNoAsignadas().length === 0) {
                  <tr><td colspan="4" class="px-5 py-12 text-center text-slate-500 text-sm">No hay tareas disponibles.</td></tr>
                }
                @for (tarea of workflowService.tareasNoAsignadas(); track tarea.id) {
                  <tr class="hover:bg-amber-500/[0.03] transition-colors">
                    <td class="px-5 py-3.5 font-semibold text-slate-200">{{ tarea.actividadNombre }}</td>
                    <td class="px-5 py-3.5"><span class="font-mono text-xs text-slate-500">{{ tarea.tramiteId | slice:0:8 }}…</span></td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-slate-500/10 text-slate-400 ring-slate-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>Sin Asignar
                      </span>
                    </td>
                    <td class="px-5 py-3.5">
                      <button (click)="tomarTareaDisponible(tarea)" class="px-3 py-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-all">📥 Tomar Tarea</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (workflowService.tareasNoAsignadas().length > 0) {
              <div class="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-800/20">
                <span class="text-xs text-slate-500">{{ workflowService.tareasNoAsignadas().length }} tareas disponibles</span>
                <button (click)="cargarNoAsignadas()" class="text-xs text-indigo-400 hover:text-indigo-300 transition-all">🔄 Refrescar</button>
              </div>
            }
          </div>
        }

        <!-- ══════════ VISTA: TRÁMITES ══════════ -->
        @if (vistaActiva === 'tramites') {
          <div class="flex gap-3 mb-6">
            @for (filtro of ['EN_PROGRESO', 'INICIADO', 'COMPLETADO', 'CANCELADO']; track filtro) {
              <button (click)="filtroTramite = filtro; cargarTramites()" class="px-4 py-2 text-xs font-semibold rounded-xl border transition-all"
                      [class]="filtroTramite === filtro ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'">
                {{ filtro.replace('_', ' ') }}
              </button>
            }
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-800 bg-slate-800/40">
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Política</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Iniciado</th>
                  <th class="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                @if (workflowService.tramites().length === 0) {
                  <tr><td colspan="5" class="px-5 py-12 text-center text-slate-500 text-sm">No hay trámites con estado {{ filtroTramite }}.</td></tr>
                }
                @for (t of workflowService.tramites(); track t.id) {
                  <tr class="hover:bg-indigo-500/[0.03] transition-colors">
                    <td class="px-5 py-3.5 font-mono text-xs text-slate-400">{{ t.id | slice:0:10 }}…</td>
                    <td class="px-5 py-3.5 font-semibold text-slate-200">{{ t.politicaNombre }}</td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset" [class]="getTramiteEstadoClasses(t.estado)">{{ t.estado }}</span>
                    </td>
                    <td class="px-5 py-3.5 text-slate-400 text-xs">{{ t.iniciadoEn | date:'dd MMM yyyy HH:mm' }}</td>
                    <td class="px-5 py-3.5">
                      @if (t.estado !== 'COMPLETADO' && t.estado !== 'CANCELADO') {
                        <button (click)="cancelarTramite(t)" class="px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">Cancelar</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (workflowService.tramites().length > 0) {
              <div class="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-800/20">
                <span class="text-xs text-slate-500">{{ workflowService.tramites().length }} trámites</span>
                <button (click)="cargarTramites()" class="text-xs text-indigo-400 hover:text-indigo-300 transition-all">🔄 Refrescar</button>
              </div>
            }
          </div>
        }

        <!-- ══════════ VISTA: INICIAR TRÁMITE ══════════ -->
        @if (vistaActiva === 'iniciar') {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @if (politicasActivas.length === 0) {
              <div class="col-span-3 text-center py-16">
                <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4">📐</div>
                <p class="text-sm text-slate-500 font-medium">No hay políticas activas.</p>
                <p class="text-xs text-slate-600 mt-0.5">Un diseñador debe publicar al menos una política.</p>
              </div>
            }
            @for (p of politicasActivas; track p.id) {
              <div class="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all group">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20 font-semibold">LIVE v{{ p.version }}</span>
                  <span class="text-[10px] text-slate-600">{{ p.calles.length }} dept · {{ contarNodos(p) }} nodos</span>
                </div>
                <h3 class="text-sm font-bold text-slate-200 mb-1">{{ p.nombre }}</h3>
                <p class="text-[11px] text-slate-500 mb-4 line-clamp-2">{{ p.descripcion || 'Sin descripción' }}</p>
                <button (click)="iniciarTramite(p)" class="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all opacity-80 group-hover:opacity-100">🚀 Iniciar Trámite</button>
              </div>
            }
          </div>
        }

        <!-- Toast -->
        @if (toastMsg) {
          <div class="toast fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold"
               [class]="toastType === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
            {{ toastMsg }}
          </div>
        }

        <!-- ══════════ MODAL: Completar Tarea ══════════ -->
        @if (tareaActiva) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div class="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 class="text-lg font-bold mb-1">Completar: {{ tareaActiva.actividadNombre }}</h3>
              <p class="text-xs text-slate-500 mb-5">Define los campos de tu reporte y llena los datos.</p>

              <!-- Observaciones -->
              <div class="mb-5">
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Observaciones generales</label>
                <textarea [(ngModel)]="formularioNotas" rows="2" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" placeholder="Escribe tus observaciones..."></textarea>
              </div>

              <!-- Constructor -->
              <div class="border-t border-slate-800 pt-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="text-sm font-semibold text-slate-200">📋 Constructor de Reporte</h4>
                    <p class="text-[10px] text-slate-500 mt-0.5">Añade los campos que necesitas reportar.</p>
                  </div>
                  <button (click)="agregarCampo()" class="px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all flex items-center gap-1">
                    <span>+</span> Añadir Campo
                  </button>
                </div>

                @if (camposReporte.length === 0) {
                  <div class="text-center py-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/20">
                    <p class="text-3xl mb-2">📝</p>
                    <p class="text-xs text-slate-500">Sin campos aún.</p>
                    <p class="text-[10px] text-slate-600 mt-0.5">Haz clic en "Añadir Campo" para construir tu reporte.</p>
                  </div>
                }

                <div class="space-y-3">
                  @for (campo of camposReporte; track $index; let i = $index) {
                    <div class="p-3 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
                      <div class="flex items-center gap-2">
                        <span class="text-[10px] font-mono text-slate-600 w-5 text-center">{{ i + 1 }}</span>
                        <input [(ngModel)]="campo.nombre" placeholder="Nombre del campo" class="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                        <select [(ngModel)]="campo.tipo" class="w-32 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all">
                          <option value="texto">Texto</option><option value="numero">Número</option><option value="fecha">Fecha</option>
                          <option value="email">Email</option><option value="booleano">Sí/No</option><option value="textarea">Área de texto</option>
                        </select>
                        <button (click)="eliminarCampo(i)" class="px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar">🗑️</button>
                      </div>
                      <div class="pl-7">
                        @if (campo.tipo === 'texto') { <input [(ngModel)]="campo.valor" placeholder="Ingresa el valor..." class="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"> }
                        @if (campo.tipo === 'numero') { <input [(ngModel)]="campo.valor" type="number" placeholder="0" class="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"> }
                        @if (campo.tipo === 'fecha') { <input [(ngModel)]="campo.valor" type="date" class="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"> }
                        @if (campo.tipo === 'email') { <input [(ngModel)]="campo.valor" type="email" placeholder="correo@ejemplo.com" class="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"> }
                        @if (campo.tipo === 'booleano') { <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" [(ngModel)]="campo.valor" class="rounded border-slate-600 bg-slate-800 text-emerald-500 w-4 h-4"><span class="text-xs text-slate-400">{{ campo.valor ? 'Sí' : 'No' }}</span></label> }
                        @if (campo.tipo === 'textarea') { <textarea [(ngModel)]="campo.valor" rows="2" placeholder="Descripción detallada..." class="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all resize-none"></textarea> }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Preview JSON -->
              @if (camposReporte.length > 0) {
                <div class="mt-5 border-t border-slate-800 pt-4">
                  <button (click)="mostrarPreviewJSON = !mostrarPreviewJSON" class="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1">
                    <span>{{ mostrarPreviewJSON ? '▼' : '▶' }}</span> Vista previa del JSON generado
                  </button>
                  @if (mostrarPreviewJSON) {
                    <div class="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48 overflow-y-auto">
                      <p class="text-slate-500 mb-1">// esquemaFormulario:</p>
                      <pre>{{ generarEsquemaJSON() | json }}</pre>
                      <p class="text-slate-500 mt-2 mb-1">// datosFormulario:</p>
                      <pre>{{ generarDatosJSON() | json }}</pre>
                    </div>
                  }
                </div>
              }

              <div class="flex gap-3 mt-6">
                <button (click)="cerrarModal()" class="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">Cancelar</button>
                <button (click)="completarTarea()" class="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">✓ Completar y Derivar</button>
              </div>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class FuncionarioComponent implements OnInit {
  vistaActiva: 'bandeja' | 'disponible' | 'tramites' | 'iniciar' = 'bandeja';

  // Completar Tarea modal
  tareaActiva: RegistroActividadDTO | null = null;
  formularioNotas = '';
  camposReporte: CampoReporte[] = [];
  mostrarPreviewJSON = false;

  // Trámites
  filtroTramite = 'EN_PROGRESO';
  politicasActivas: PoliticaDTO[] = [];

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  constructor(
    public workflowService: WorkflowService,
    public auth: AuthService,
    private politicaService: PoliticaService,
  ) {}

  private get userId(): string { return this.auth.usuario()?.id || 'unknown'; }
  private get tenantId(): string { return this.auth.usuario()?.tenantId || ''; }

  ngOnInit(): void {
    this.workflowService.cargarBandejaPendientes(this.userId).subscribe();
  }

  // ── Data Loading ─────────────────────────────────────────
  cargarNoAsignadas(): void { this.workflowService.cargarTareasNoAsignadas().subscribe(); }

  cargarTramites(): void {
    this.workflowService.listarTramites(this.tenantId, this.filtroTramite).subscribe();
  }

  cargarPoliticasActivas(): void {
    this.politicaService.listarActivasPorTenant(this.tenantId).subscribe(p => this.politicasActivas = p);
  }

  contarNodos(p: PoliticaDTO): number { return p.calles.reduce((s, c) => s + c.actividades.length, 0); }

  // ── Stats ────────────────────────────────────────────────
  contarPorEstado(estado: string): number {
    const source = this.vistaActiva === 'disponible'
      ? this.workflowService.tareasNoAsignadas()
      : this.workflowService.tareasPendientes();
    return source.filter(t => t.estado === estado).length;
  }

  // ── Tomar Tarea (desde bandeja o disponibles) ────────────
  tomarTarea(tarea: RegistroActividadDTO): void {
    this.workflowService.tomarTarea(tarea.id, this.userId).subscribe({
      next: () => { this.workflowService.cargarBandejaPendientes(this.userId).subscribe(); this.showToast('Tarea tomada', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al tomar tarea', 'error'),
    });
  }

  tomarTareaDisponible(tarea: RegistroActividadDTO): void {
    this.workflowService.tomarTarea(tarea.id, this.userId).subscribe({
      next: () => {
        this.cargarNoAsignadas();
        this.workflowService.cargarBandejaPendientes(this.userId).subscribe();
        this.showToast('Tarea tomada. Ahora está en "Mis Tareas".', 'success');
      },
      error: (e) => this.showToast(e.error?.message || 'Error al tomar tarea', 'error'),
    });
  }

  // ── Completar Tarea ──────────────────────────────────────
  abrirFormulario(tarea: RegistroActividadDTO): void {
    this.tareaActiva = tarea;
    this.formularioNotas = '';
    this.camposReporte = [];
    this.mostrarPreviewJSON = false;
  }

  agregarCampo(): void { this.camposReporte.push({ nombre: '', tipo: 'texto', valor: '' }); }
  eliminarCampo(index: number): void { this.camposReporte.splice(index, 1); }

  generarEsquemaJSON(): Record<string, any> {
    return { campos: this.camposReporte.map(c => ({ nombre: c.nombre, tipo: c.tipo, requerido: true })) };
  }
  generarDatosJSON(): Record<string, any> {
    const datos: Record<string, any> = {};
    for (const c of this.camposReporte) { if (c.nombre.trim()) datos[c.nombre.trim()] = c.valor; }
    return datos;
  }

  cerrarModal(): void { this.tareaActiva = null; this.formularioNotas = ''; this.camposReporte = []; }

  completarTarea(): void {
    if (!this.tareaActiva) return;
    const request: CompletarTareaRequest = {
      registroId: this.tareaActiva.id,
      esquemaFormulario: this.generarEsquemaJSON(),
      datosFormulario: this.generarDatosJSON(),
      notas: this.formularioNotas,
    };
    this.workflowService.completarTarea(request, this.userId).subscribe({
      next: () => { this.cerrarModal(); this.showToast('Tarea completada y derivada ✓', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al completar', 'error'),
    });
  }

  // ── Iniciar Trámite ──────────────────────────────────────
  iniciarTramite(p: PoliticaDTO): void {
    this.workflowService.iniciarTramite({ politicaId: p.id }).subscribe({
      next: (t) => {
        this.showToast(`Trámite creado: ${t.id.substring(0, 8)}…`, 'success');
        this.workflowService.cargarBandejaPendientes(this.userId).subscribe();
        this.cargarNoAsignadas();
      },
      error: (e) => this.showToast(e.error?.message || 'Error al iniciar', 'error'),
    });
  }

  // ── Cancelar Trámite ─────────────────────────────────────
  cancelarTramite(t: TramiteDTO): void {
    this.workflowService.cancelarTramite(t.id).subscribe({
      next: () => { this.cargarTramites(); this.showToast('Trámite cancelado', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al cancelar', 'error'),
    });
  }

  // ── Style Helpers ────────────────────────────────────────
  getEstadoClasses(estado: string): string {
    return ({ PENDIENTE: 'bg-slate-500/10 text-slate-400 ring-slate-500/20', EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', HECHO: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', BLOQUEADO: 'bg-orange-500/10 text-orange-400 ring-orange-500/20' } as any)[estado] || 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
  }
  getEstadoDot(estado: string): string {
    return ({ PENDIENTE: 'bg-slate-400', EN_PROGRESO: 'bg-amber-400 animate-pulse', HECHO: 'bg-emerald-400', BLOQUEADO: 'bg-orange-400' } as any)[estado] || 'bg-slate-400';
  }
  getTramiteEstadoClasses(estado: string): string {
    return ({ INICIADO: 'bg-blue-500/10 text-blue-400 ring-blue-500/20', EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', COMPLETADO: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', CANCELADO: 'bg-red-500/10 text-red-400 ring-red-500/20' } as any)[estado] || 'bg-slate-500/10 text-slate-400 ring-slate-500/20';
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg; this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

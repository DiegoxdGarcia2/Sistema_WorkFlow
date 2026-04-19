import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; height: calc(100vh - 4rem); }
    .dot-grid {
      background-image: radial-gradient(circle, #334155 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #020617;
    }
    .nodo-card {
      position: absolute; cursor: grab; user-select: none;
      transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
    }
    .nodo-card:active { cursor: grabbing; }
    .nodo-card:hover { transform: scale(1.02); }
    .nodo-card.selected {
      border-color: rgba(99,102,241,0.6) !important;
      box-shadow: 0 0 25px rgba(99,102,241,0.2), 0 0 50px rgba(99,102,241,0.08);
    }
    .handle { width: 10px; height: 10px; border-radius: 50%; position: absolute; top: 50%; transform: translateY(-50%); border: 2px solid #64748b; background: #1e293b; transition: all 0.15s ease; z-index: 2; cursor: crosshair; }
    .handle:hover { border-color: #818cf8; background: #312e81; box-shadow: 0 0 8px rgba(129,140,248,0.5); }
    .handle-left { left: -5px; }
    .handle-right { right: -5px; }
    .connection-line { stroke: #475569; stroke-width: 2; fill: none; }
    .connection-line-active { stroke: #818cf8; stroke-width: 2.5; filter: drop-shadow(0 0 4px rgba(129,140,248,0.4)); }
    .toolbox-item { transition: all 0.15s ease; cursor: pointer; }
    .toolbox-item:hover { transform: translateX(4px); background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.3); }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .toast { animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `],
  template: `
    <div class="flex h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">

      <!-- ══════════ LEFT SIDEBAR — Toolbox & Policies (280px) ══════════ -->
      <aside class="w-[280px] flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
        <div class="px-5 pt-5 pb-3 border-b border-slate-800/60">
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span class="text-white text-sm font-bold">⚡</span>
            </div>
            <div>
              <h1 class="text-xs font-bold tracking-tight text-slate-100">Workflow Designer</h1>
              <p class="text-[10px] text-slate-500">Motor UML 2.5+</p>
            </div>
          </div>
          <button (click)="mostrarModalCrear = true"
                  class="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
            + Nueva Política
          </button>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-1.5">
          <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 mb-2 px-1">Políticas</p>
          @if (politicaService.politicas().length === 0) {
            <div class="text-center py-10">
              <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-2xl mb-3">📐</div>
              <p class="text-xs text-slate-500 font-medium">Sin políticas</p>
              <p class="text-[10px] text-slate-600 mt-0.5">Crea tu primer flujo de trabajo.</p>
            </div>
          }
          @for (p of politicaService.politicas(); track p.id) {
            <div (click)="seleccionar(p)"
                 class="group px-3 py-3 rounded-xl border cursor-pointer transition-all"
                 [class]="sel?.id === p.id ? 'border-indigo-500/40 bg-indigo-500/[0.08] shadow-lg shadow-indigo-500/5' : 'border-slate-800/60 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60'">
              <div class="flex items-center justify-between mb-1">
                <h3 class="text-[13px] font-semibold text-slate-200 truncate flex-1 mr-2">{{ p.nombre }}</h3>
                <span class="text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide"
                      [class]="p.estaActiva ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-slate-700/40 text-slate-500 ring-1 ring-slate-700/40'">
                  {{ p.estaActiva ? 'LIVE' : 'DRAFT' }}
                </span>
              </div>
              <div class="flex items-center gap-2 text-[10px] text-slate-500">
                <span>v{{ p.version }}</span><span class="w-0.5 h-0.5 rounded-full bg-slate-700"></span>
                <span>{{ p.calles.length }} dept</span><span class="w-0.5 h-0.5 rounded-full bg-slate-700"></span>
                <span>{{ contarNodos(p) }} nodos</span>
              </div>
            </div>
          }
        </div>

        <!-- Toolbox: Click to add nodes -->
        @if (sel && !sel.estaActiva) {
          <div class="border-t border-slate-800/60 px-4 py-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600 mb-2 px-1">Click para añadir</p>
            <div class="space-y-1">
              @for (tool of toolbox; track tool.tipo) {
                <div (click)="agregarNodo(tool.tipo)" class="toolbox-item flex items-center gap-2.5 px-3 py-2 rounded-lg border border-transparent">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center text-sm" [style.background]="tool.bgColor" [style.color]="tool.textColor">{{ tool.icon }}</div>
                  <div>
                    <p class="text-[11px] font-semibold text-slate-300">{{ tool.label }}</p>
                    <p class="text-[9px] text-slate-600">{{ tool.desc }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </aside>

      <!-- ══════════ CENTER CANVAS — Dot Grid (flex-1) ══════════ -->
      <main class="flex-1 relative overflow-hidden dot-grid" (mousedown)="onCanvasBgClick($event)" (mousemove)="onCanvasMouseMove($event)" (mouseup)="onCanvasMouseUp()">

        @if (sel) {
          <!-- Canvas Toolbar -->
          <div class="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div class="flex items-center gap-2 pointer-events-auto">
              <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/70 backdrop-blur-xl border border-slate-800 shadow-xl">
                <div class="w-2 h-2 rounded-full" [class]="sel.estaActiva ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"></div>
                <span class="text-xs font-bold text-slate-200">{{ sel.nombre }}</span>
                <span class="text-[10px] text-slate-500 font-mono">v{{ sel.version }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 pointer-events-auto">
              @if (!sel.estaActiva) {
                <button (click)="mostrarModalAddCalle = true" class="px-3 py-2 text-[11px] font-semibold text-slate-300 bg-slate-900/70 backdrop-blur-xl hover:bg-slate-800/90 border border-slate-700 rounded-xl transition-all shadow-lg">🏢 + Calle</button>
                <button (click)="mostrarModalTransicion = true" class="px-3 py-2 text-[11px] font-semibold text-slate-300 bg-slate-900/70 backdrop-blur-xl hover:bg-slate-800/90 border border-slate-700 rounded-xl transition-all shadow-lg">🔗 + Enlace</button>
              }
              <button (click)="guardarPolitica()" class="px-3.5 py-2 text-[11px] font-semibold text-slate-300 bg-slate-900/70 backdrop-blur-xl hover:bg-slate-800/90 border border-slate-700 rounded-xl transition-all shadow-lg flex items-center gap-1.5">💾 Guardar</button>
              @if (!sel.estaActiva) {
                <button (click)="activarPolitica()" class="px-3.5 py-2 text-[11px] font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">🚀 Publicar</button>
                <button (click)="confirmarEliminar()" class="px-3 py-2 text-[11px] font-semibold text-red-400 bg-slate-900/70 backdrop-blur-xl hover:bg-red-500/10 border border-slate-700 rounded-xl transition-all shadow-lg">🗑️</button>
              }
            </div>
          </div>

          <!-- Info -->
          <div class="absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-lg backdrop-blur-xl bg-slate-900/70 border border-slate-800 text-[10px] text-slate-400 font-mono">
            {{ contarNodos(sel) }} nodos · {{ sel.transiciones.length }} enlaces · {{ sel.calles.length }} calles
          </div>

          <!-- SVG Connections -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none z-[5]">
            <defs>
              <marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#475569"/></marker>
              <marker id="aha" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#818cf8"/></marker>
            </defs>
            @for (conn of getConnectionPaths(); track conn.id) {
              <path [attr.d]="conn.path" class="connection-line" [class.connection-line-active]="nodoSeleccionado && (conn.origenId === nodoSeleccionado.id || conn.destinoId === nodoSeleccionado.id)" [attr.marker-end]="nodoSeleccionado && (conn.origenId === nodoSeleccionado.id || conn.destinoId === nodoSeleccionado.id) ? 'url(#aha)' : 'url(#ah)'"/>
              <!-- Label -->
              @if (conn.label) {
                <text [attr.x]="conn.labelX" [attr.y]="conn.labelY" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">{{ conn.label }}</text>
              }
            }
          </svg>

          <!-- Calle Labels -->
          @for (calle of sel.calles; track calle.id; let ci = $index) {
            <div class="absolute z-[3] flex items-center gap-2" [style.left.px]="20" [style.top.px]="getLaneY(ci) - 18">
              <span class="px-2.5 py-1 rounded-lg border border-slate-800/40 bg-slate-900/30 backdrop-blur-sm text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">🏢 {{ calle.nombre }}</span>
              @if (!sel.estaActiva) {
                <button (click)="eliminarCalle(ci)" class="w-5 h-5 rounded flex items-center justify-center text-[8px] text-red-500/50 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Eliminar calle">✕</button>
              }
            </div>
            @if (ci > 0) { <div class="absolute left-0 right-0 h-px bg-slate-800/30 z-[2]" [style.top.px]="getLaneY(ci) - 30"></div> }
          }

          <!-- Nodes -->
          @for (calle of sel.calles; track calle.id; let ci = $index) {
            @for (act of calle.actividades; track act.id; let ai = $index) {
              <div class="nodo-card rounded-2xl z-10" [class.selected]="nodoSeleccionado?.id === act.id"
                   [style.left.px]="getNodoPos(ci, ai).x" [style.top.px]="getNodoPos(ci, ai).y" [style.width.px]="220"
                   (mousedown)="onNodoMouseDown($event, ci, ai)" (click)="seleccionarNodo(ci, ai, $event)"
                   [style.background]="'rgba(15,23,42,0.85)'" [style.backdrop-filter]="'blur(20px)'"
                   [style.border]="'1px solid ' + (nodoSeleccionado?.id === act.id ? 'rgba(99,102,241,0.5)' : 'rgba(51,65,85,0.6)')">
                <div class="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-md" [style.background]="getNodeAccentBg(act.tipo)" [style.box-shadow]="'0 4px 12px ' + getNodeGlow(act.tipo)">{{ getActIcon(act.tipo) }}</div>
                  <div class="min-w-0 flex-1">
                    <p class="text-[11px] font-bold text-slate-100 truncate">{{ act.nombre }}</p>
                    <p class="text-[9px] font-semibold uppercase tracking-[0.15em] mt-0.5" [style.color]="getNodeAccentText(act.tipo)">{{ getNodeCategory(act.tipo) }}</p>
                  </div>
                </div>
                <div class="px-4 pb-3 pt-1 border-t border-slate-800/30 mt-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] text-slate-600 font-mono">{{ act.id | slice:0:8 }}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded font-semibold" [style.background]="getNodeAccentBg(act.tipo)" [style.color]="getNodeAccentText(act.tipo)">{{ act.tipo }}</span>
                  </div>
                </div>
                <div class="handle handle-left" (mousedown)="$event.stopPropagation()"></div>
                <div class="handle handle-right" (mousedown)="$event.stopPropagation()"></div>
              </div>
            }
          }
        } @else {
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <div class="w-20 h-20 mx-auto rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-4xl mb-5 shadow-2xl">🎨</div>
              <h2 class="text-lg font-bold text-slate-300 mb-1">Selecciona una Política</h2>
              <p class="text-sm text-slate-500 max-w-xs">Elige una política de la barra lateral o crea una nueva para comenzar a diseñar tu flujo de trabajo.</p>
            </div>
          </div>
        }

        <!-- Toast -->
        @if (toastMsg) {
          <div class="toast absolute top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl border shadow-2xl text-xs font-semibold"
               [class]="toastType === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
            {{ toastMsg }}
          </div>
        }
      </main>

      <!-- ══════════ RIGHT SIDEBAR — Properties (320px) ══════════ -->
      @if (nodoSeleccionado && sel) {
        <aside class="w-[320px] flex-shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md" [style.background]="getNodeAccentBg(nodoSeleccionado.tipo)" [style.box-shadow]="'0 4px 12px ' + getNodeGlow(nodoSeleccionado.tipo)">{{ getActIcon(nodoSeleccionado.tipo) }}</div>
              <div><p class="text-xs font-bold text-slate-100">Propiedades</p><p class="text-[9px] font-semibold uppercase tracking-[0.15em]" [style.color]="getNodeAccentText(nodoSeleccionado.tipo)">{{ getNodeCategory(nodoSeleccionado.tipo) }}</p></div>
            </div>
            <button (click)="nodoSeleccionado = null" class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-all text-xs">✕</button>
          </div>
          <div class="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-5">
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Nombre del Nodo</label>
              <input [(ngModel)]="editAct.nombre" [disabled]="sel.estaActiva" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all disabled:opacity-50" placeholder="Nombre de la actividad">
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Tipo de Nodo</label>
              <select [(ngModel)]="editAct.tipo" [disabled]="sel.estaActiva" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all appearance-none disabled:opacity-50">
                <option value="INICIO">🟢 Inicio (Trigger)</option><option value="TAREA">📄 Tarea (Action)</option>
                <option value="DECISION">🔶 Decisión (Logic)</option><option value="FORK">🔀 Fork (Parallel)</option>
                <option value="JOIN">🔁 Join (Merge)</option><option value="FIN">🔴 Fin (End)</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Departamento</label>
              <div class="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-400">🏢 {{ sel.calles[editCalleIdx]?.nombre || 'N/A' }}</div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">ID</label>
              <div class="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-500 font-mono select-all">{{ nodoSeleccionado.id }}</div>
            </div>
            <div>
              <label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Conexiones</label>
              <div class="space-y-1.5">
                @for (conn of getNodeConnections(nodoSeleccionado.id); track conn.id) {
                  <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <span class="text-slate-400 truncate">{{ conn.fromName }}</span><span class="text-indigo-400">→</span><span class="text-slate-400 truncate">{{ conn.toName }}</span>
                    @if (!sel.estaActiva) {
                      <button (click)="eliminarTransicionById(conn.id)" class="ml-auto text-red-500/50 hover:text-red-400 transition-all" title="Eliminar">✕</button>
                    }
                  </div>
                }
                @if (getNodeConnections(nodoSeleccionado.id).length === 0) { <p class="text-[10px] text-slate-600 italic px-1">Sin conexiones</p> }
              </div>
            </div>
          </div>
          <div class="px-5 py-4 border-t border-slate-800/60 space-y-2">
            @if (!sel.estaActiva) {
              <button (click)="guardarNodoDesdePanel()" class="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">💾 Aplicar Cambios</button>
              <button (click)="eliminarNodoSeleccionado()" class="w-full px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20">🗑️ Eliminar Nodo</button>
            }
            <button (click)="nodoSeleccionado = null" class="w-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-xl transition-all">Cerrar</button>
          </div>
        </aside>
      }

      <!-- ══════════ MODAL: Crear Política ══════════ -->
      @if (mostrarModalCrear) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div class="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/25">⚡</div>
              <div><h3 class="text-base font-bold text-slate-100">Nueva Política</h3><p class="text-[10px] text-slate-500">Se generará una estructura base INICIO→FIN.</p></div>
            </div>
            @if (errorCrear) { <div class="mb-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{{ errorCrear }}</div> }
            <div class="space-y-4">
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Nombre *</label>
                <input [(ngModel)]="nuevaPolitica.nombre" placeholder="Ej. Aprobación de Créditos" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all"></div>
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Descripción</label>
                <textarea [(ngModel)]="nuevaPolitica.descripcion" rows="3" placeholder="Describe el propósito del flujo..." class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all resize-none"></textarea></div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="mostrarModalCrear = false" class="px-4 py-2.5 text-xs font-medium text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="crearPolitica()" class="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all">Crear</button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════ MODAL: Agregar Calle ══════════ -->
      @if (mostrarModalAddCalle) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div class="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6">
            <h3 class="text-base font-bold mb-4">🏢 Nueva Calle (Departamento)</h3>
            <input [(ngModel)]="nuevaCalleNombre" placeholder="Ej. Departamento Técnico" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all mb-4">
            <div class="flex justify-end gap-3">
              <button (click)="mostrarModalAddCalle = false" class="px-4 py-2 text-xs text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="agregarCalle()" class="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg transition-all">Agregar</button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════ MODAL: Crear Transición ══════════ -->
      @if (mostrarModalTransicion) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div class="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6">
            <h3 class="text-base font-bold mb-4">🔗 Nueva Transición</h3>
            <div class="space-y-3">
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Origen</label>
                <select [(ngModel)]="nuevaTransicion.origenId" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                  <option value="">-- Seleccionar --</option>
                  @for (act of getAllActividades(); track act.id) { <option [value]="act.id">{{ act.nombre }} ({{ act.tipo }})</option> }
                </select></div>
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Destino</label>
                <select [(ngModel)]="nuevaTransicion.destinoId" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                  <option value="">-- Seleccionar --</option>
                  @for (act of getAllActividades(); track act.id) { <option [value]="act.id">{{ act.nombre }} ({{ act.tipo }})</option> }
                </select></div>
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Tipo</label>
                <select [(ngModel)]="nuevaTransicion.tipoRuta" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                  <option value="SECUENCIAL">Secuencial</option><option value="CONDICIONAL">Condicional</option><option value="PARALELA">Paralela</option>
                </select></div>
              <div><label class="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 mb-1.5">Etiqueta (opcional)</label>
                <input [(ngModel)]="nuevaTransicion.etiqueta" placeholder="Ej. Aprobado" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition-all"></div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="mostrarModalTransicion = false" class="px-4 py-2 text-xs text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="agregarTransicion()" class="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl shadow-lg transition-all">Crear Enlace</button>
            </div>
          </div>
        </div>
      }

      <!-- ══════════ MODAL: Confirmar Eliminar ══════════ -->
      @if (mostrarConfirmEliminar) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div class="w-full max-w-sm rounded-2xl border border-red-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-6 text-center">
            <p class="text-3xl mb-3">⚠️</p>
            <h3 class="text-base font-bold mb-2">¿Eliminar política?</h3>
            <p class="text-xs text-slate-400 mb-5">Esta acción no se puede deshacer. Se eliminará "{{ sel?.nombre }}" permanentemente.</p>
            <div class="flex gap-3">
              <button (click)="mostrarConfirmEliminar = false" class="flex-1 px-4 py-2.5 text-xs font-medium text-slate-400 bg-slate-800 rounded-xl transition-all">Cancelar</button>
              <button (click)="eliminarPolitica()" class="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-lg transition-all">Eliminar</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DesignerComponent implements OnInit {
  sel: PoliticaDTO | null = null;
  mostrarModalCrear = false;
  errorCrear = '';
  nuevaPolitica = { nombre: '', descripcion: '' };

  // Node selection
  nodoSeleccionado: Actividad | null = null;
  editCalleIdx = 0;
  editActIdx = 0;
  editAct: any = {};

  // Drag
  isDragging = false;
  dragNodeKey = '';
  dragOffsetX = 0;
  dragOffsetY = 0;
  nodePositions: Record<string, { x: number; y: number }> = {};

  // Modals
  mostrarModalAddCalle = false;
  nuevaCalleNombre = '';
  mostrarModalTransicion = false;
  nuevaTransicion = { origenId: '', destinoId: '', tipoRuta: 'SECUENCIAL' as TipoRuta, etiqueta: '' };
  mostrarConfirmEliminar = false;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  toolbox = [
    { tipo: 'INICIO' as TipoActividad, icon: '🟢', label: 'Trigger', desc: 'Punto de inicio', bgColor: 'rgba(16,185,129,0.12)', textColor: '#34d399' },
    { tipo: 'TAREA' as TipoActividad, icon: '📄', label: 'Action', desc: 'Tarea / Actividad', bgColor: 'rgba(99,102,241,0.12)', textColor: '#818cf8' },
    { tipo: 'DECISION' as TipoActividad, icon: '🔶', label: 'Logic', desc: 'Decisión condicional', bgColor: 'rgba(245,158,11,0.12)', textColor: '#fbbf24' },
    { tipo: 'FORK' as TipoActividad, icon: '🔀', label: 'Parallel', desc: 'Ejecución paralela', bgColor: 'rgba(168,85,247,0.12)', textColor: '#c084fc' },
    { tipo: 'JOIN' as TipoActividad, icon: '🔁', label: 'Merge', desc: 'Sincronización', bgColor: 'rgba(168,85,247,0.12)', textColor: '#c084fc' },
    { tipo: 'FIN' as TipoActividad, icon: '🔴', label: 'End', desc: 'Punto final', bgColor: 'rgba(239,68,68,0.12)', textColor: '#f87171' },
  ];

  constructor(public politicaService: PoliticaService, private auth: AuthService) {}
  ngOnInit(): void { this.cargarPoliticas(); }

  cargarPoliticas(): void {
    const tid = this.auth.usuario()?.tenantId;
    if (tid) this.politicaService.listarPorTenant(tid).subscribe();
  }

  // ── Policy Selection ─────────────────────────────────────
  seleccionar(p: PoliticaDTO): void { this.sel = JSON.parse(JSON.stringify(p)); this.nodoSeleccionado = null; this.generateLayout(); }
  contarNodos(p: PoliticaDTO): number { return p.calles.reduce((s, c) => s + c.actividades.length, 0); }

  // ── Layout ───────────────────────────────────────────────
  generateLayout(): void {
    if (!this.sel) return;
    this.nodePositions = {};
    const W = 220, H = 80, GAP = 80, LANE = 160, TOP = 80, LEFT = 200;
    for (let ci = 0; ci < this.sel.calles.length; ci++) {
      for (let ai = 0; ai < this.sel.calles[ci].actividades.length; ai++) {
        this.nodePositions[`${ci}-${ai}`] = { x: LEFT + ai * (W + GAP), y: TOP + ci * LANE };
      }
    }
  }
  getNodoPos(ci: number, ai: number): { x: number; y: number } { return this.nodePositions[`${ci}-${ai}`] || { x: 100, y: 100 }; }
  getLaneY(ci: number): number { return 80 + ci * 160; }

  // ── Node Selection ───────────────────────────────────────
  seleccionarNodo(ci: number, ai: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDragging) return;
    const act = this.sel!.calles[ci].actividades[ai];
    this.nodoSeleccionado = act; this.editCalleIdx = ci; this.editActIdx = ai;
    this.editAct = { nombre: act.nombre, tipo: act.tipo };
  }
  onCanvasBgClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (t.classList.contains('dot-grid') || t.tagName === 'svg') this.nodoSeleccionado = null;
  }
  guardarNodoDesdePanel(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
    const act = this.sel.calles[this.editCalleIdx].actividades[this.editActIdx];
    act.nombre = this.editAct.nombre; act.tipo = this.editAct.tipo;
    this.nodoSeleccionado = act;
    this.showToast('Nodo actualizado', 'success');
  }

  // ── Drag ─────────────────────────────────────────────────
  onNodoMouseDown(e: MouseEvent, ci: number, ai: number): void {
    e.preventDefault();
    const key = `${ci}-${ai}`, pos = this.nodePositions[key];
    if (!pos) return;
    this.isDragging = false; this.dragNodeKey = key;
    this.dragOffsetX = e.clientX - pos.x; this.dragOffsetY = e.clientY - pos.y;
    const sx = e.clientX, sy = e.clientY;
    const check = (me: MouseEvent) => { if (Math.abs(me.clientX - sx) > 3 || Math.abs(me.clientY - sy) > 3) { this.isDragging = true; document.removeEventListener('mousemove', check); } };
    document.addEventListener('mousemove', check);
  }
  onCanvasMouseMove(e: MouseEvent): void { if (!this.isDragging || !this.dragNodeKey) return; this.nodePositions[this.dragNodeKey] = { x: e.clientX - this.dragOffsetX, y: e.clientY - this.dragOffsetY }; }
  onCanvasMouseUp(): void { if (this.isDragging) setTimeout(() => this.isDragging = false, 50); this.dragNodeKey = ''; }

  // ── SVG Connections ──────────────────────────────────────
  getConnectionPaths(): { id: string; path: string; origenId: string; destinoId: string; label: string; labelX: number; labelY: number }[] {
    if (!this.sel) return [];
    return this.sel.transiciones.map(t => {
      const from = this.findNodePos(t.origenId), to = this.findNodePos(t.destinoId);
      if (!from || !to) return null;
      const x1 = from.x + 220, y1 = from.y + 40, x2 = to.x, y2 = to.y + 40;
      const dx = Math.abs(x2 - x1) * 0.5;
      return { id: t.id, path: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, origenId: t.origenId, destinoId: t.destinoId, label: t.etiqueta || '', labelX: (x1 + x2) / 2, labelY: (y1 + y2) / 2 - 8 };
    }).filter(Boolean) as any[];
  }
  private findNodePos(actId: string): { x: number; y: number } | null {
    if (!this.sel) return null;
    for (let ci = 0; ci < this.sel.calles.length; ci++) { const ai = this.sel.calles[ci].actividades.findIndex(a => a.id === actId); if (ai >= 0) return this.getNodoPos(ci, ai); }
    return null;
  }
  getNodeConnections(actId: string): { id: string; fromName: string; toName: string; tipoRuta: string }[] {
    if (!this.sel) return [];
    return this.sel.transiciones.filter(t => t.origenId === actId || t.destinoId === actId)
      .map(t => ({ id: t.id, fromName: this.getNombreActividad(t.origenId), toName: this.getNombreActividad(t.destinoId), tipoRuta: t.tipoRuta }));
  }

  // ── CRUD: Policy ───────────────────────────────────────
  crearPolitica(): void {
    this.errorCrear = '';
    const tid = this.auth.usuario()?.tenantId;
    if (!tid || !this.nuevaPolitica.nombre.trim()) { this.errorCrear = 'El nombre es obligatorio.'; return; }
    this.politicaService.crear({ tenantId: tid, nombre: this.nuevaPolitica.nombre, descripcion: this.nuevaPolitica.descripcion } as any).subscribe({
      next: (created) => { this.mostrarModalCrear = false; this.nuevaPolitica = { nombre: '', descripcion: '' }; this.cargarPoliticas(); this.seleccionar(created); this.showToast('Política creada', 'success'); },
      error: (e) => this.errorCrear = e.error?.message || 'Error al crear.',
    });
  }
  guardarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.actualizar(this.sel.id, this.sel).subscribe({
      next: (u) => { this.sel = JSON.parse(JSON.stringify(u)); this.generateLayout(); this.cargarPoliticas(); this.showToast('Guardado correctamente', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al guardar', 'error'),
    });
  }
  activarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.activar(this.sel.id).subscribe({
      next: (u) => { this.sel = JSON.parse(JSON.stringify(u)); this.cargarPoliticas(); this.showToast('Política publicada 🚀', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al activar', 'error'),
    });
  }
  confirmarEliminar(): void { this.mostrarConfirmEliminar = true; }
  eliminarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.eliminar(this.sel.id).subscribe({
      next: () => { this.sel = null; this.nodoSeleccionado = null; this.mostrarConfirmEliminar = false; this.cargarPoliticas(); this.showToast('Política eliminada', 'success'); },
      error: (e) => { this.mostrarConfirmEliminar = false; this.showToast(e.error?.message || 'Error al eliminar', 'error'); },
    });
  }

  // ── CRUD: Calles ─────────────────────────────────────────
  agregarCalle(): void {
    if (!this.sel || !this.nuevaCalleNombre.trim()) return;
    this.sel.calles.push({ id: crypto.randomUUID(), nombre: this.nuevaCalleNombre.trim(), orden: this.sel.calles.length, actividades: [] });
    this.nuevaCalleNombre = ''; this.mostrarModalAddCalle = false; this.generateLayout();
    this.showToast('Calle añadida', 'success');
  }
  eliminarCalle(ci: number): void {
    if (!this.sel) return;
    const removedIds = this.sel.calles[ci].actividades.map(a => a.id);
    this.sel.transiciones = this.sel.transiciones.filter(t => !removedIds.includes(t.origenId) && !removedIds.includes(t.destinoId));
    this.sel.calles.splice(ci, 1);
    this.nodoSeleccionado = null; this.generateLayout();
    this.showToast('Calle eliminada', 'success');
  }

  // ── CRUD: Nodos ──────────────────────────────────────────
  agregarNodo(tipo: TipoActividad): void {
    if (!this.sel || this.sel.estaActiva) return;
    const ci = this.sel.calles.length > 0 ? 0 : -1;
    if (ci < 0) { this.showToast('Crea una calle primero', 'error'); return; }
    const names: Record<string,string> = { INICIO: 'Nuevo Inicio', TAREA: 'Nueva Tarea', DECISION: 'Nueva Decisión', FORK: 'Fork', JOIN: 'Join', FIN: 'Nuevo Fin', MERGE: 'Merge' };
    const newAct: Actividad = { id: crypto.randomUUID(), nombre: names[tipo] || 'Nuevo Nodo', tipo, esInicial: tipo === 'INICIO', esFinal: tipo === 'FIN', orden: this.sel.calles[ci].actividades.length };
    this.sel.calles[ci].actividades.push(newAct);
    this.generateLayout();
    this.showToast(`Nodo ${tipo} añadido`, 'success');
  }
  eliminarNodoSeleccionado(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
    const id = this.nodoSeleccionado.id;
    this.sel.calles[this.editCalleIdx].actividades.splice(this.editActIdx, 1);
    this.sel.transiciones = this.sel.transiciones.filter(t => t.origenId !== id && t.destinoId !== id);
    this.nodoSeleccionado = null; this.generateLayout();
    this.showToast('Nodo eliminado', 'success');
  }

  // ── CRUD: Transiciones ───────────────────────────────────
  agregarTransicion(): void {
    if (!this.sel || !this.nuevaTransicion.origenId || !this.nuevaTransicion.destinoId) return;
    if (this.nuevaTransicion.origenId === this.nuevaTransicion.destinoId) { this.showToast('Origen y destino deben ser diferentes', 'error'); return; }
    this.sel.transiciones.push({
      id: crypto.randomUUID(), origenId: this.nuevaTransicion.origenId, destinoId: this.nuevaTransicion.destinoId,
      tipoRuta: this.nuevaTransicion.tipoRuta, condicion: '', etiqueta: this.nuevaTransicion.etiqueta, prioridad: 0,
    });
    this.nuevaTransicion = { origenId: '', destinoId: '', tipoRuta: 'SECUENCIAL', etiqueta: '' };
    this.mostrarModalTransicion = false;
    this.showToast('Transición creada', 'success');
  }
  eliminarTransicionById(id: string): void {
    if (!this.sel) return;
    this.sel.transiciones = this.sel.transiciones.filter(t => t.id !== id);
    this.showToast('Transición eliminada', 'success');
  }

  getAllActividades(): Actividad[] { return this.sel?.calles.flatMap(c => c.actividades) || []; }

  // ── Helpers ──────────────────────────────────────────────
  getNombreActividad(id: string): string { for (const c of this.sel?.calles || []) { const a = c.actividades.find(a => a.id === id); if (a) return a.nombre; } return id.substring(0, 8); }
  getActIcon(t: string): string { return ({ INICIO: '🟢', FIN: '🔴', TAREA: '📄', DECISION: '🔶', FORK: '🔀', JOIN: '🔁' } as any)[t] || '⬜'; }
  getNodeAccentBg(t: string): string { return ({ INICIO: 'rgba(16,185,129,0.15)', FIN: 'rgba(239,68,68,0.15)', TAREA: 'rgba(99,102,241,0.15)', DECISION: 'rgba(245,158,11,0.15)', FORK: 'rgba(168,85,247,0.15)', JOIN: 'rgba(168,85,247,0.15)' } as any)[t] || 'rgba(100,116,139,0.15)'; }
  getNodeAccentText(t: string): string { return ({ INICIO: '#34d399', FIN: '#f87171', TAREA: '#818cf8', DECISION: '#fbbf24', FORK: '#c084fc', JOIN: '#c084fc' } as any)[t] || '#94a3b8'; }
  getNodeGlow(t: string): string { return ({ INICIO: 'rgba(16,185,129,0.2)', FIN: 'rgba(239,68,68,0.2)', TAREA: 'rgba(99,102,241,0.2)', DECISION: 'rgba(245,158,11,0.2)', FORK: 'rgba(168,85,247,0.2)', JOIN: 'rgba(168,85,247,0.2)' } as any)[t] || 'rgba(100,116,139,0.2)'; }
  getNodeCategory(t: string): string { return ({ INICIO: 'TRIGGER', FIN: 'END POINT', TAREA: 'ACTION', DECISION: 'LOGIC GATE', FORK: 'PARALLEL', JOIN: 'SYNC MERGE' } as any)[t] || 'NODE'; }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg; this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

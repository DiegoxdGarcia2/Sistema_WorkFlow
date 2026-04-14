import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';

interface CampoFormulario { label: string; type: string; required: boolean; }

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[calc(100vh-4rem)]">
      <aside class="w-72 border-r border-slate-800 bg-slate-900/50 p-5 overflow-y-auto">
        <div class="mb-6">
          <h2 class="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Políticas de Negocio</h2>
          <button (click)="mostrarModalCrear = true"
                  class="w-full px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all mb-2">
            + Crear Política
          </button>
        </div>
        @if (politicaService.politicas().length === 0) {
          <div class="text-center py-8">
            <p class="text-4xl mb-3">📐</p>
            <p class="text-sm text-slate-500">No hay políticas.</p>
            <p class="text-xs text-slate-600 mt-1">Crea tu primer flujo.</p>
          </div>
        }
        @for (p of politicaService.politicas(); track p.id) {
          <div (click)="seleccionar(p)"
               class="p-4 mb-2 rounded-xl border transition-all cursor-pointer"
               [class]="sel?.id === p.id ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-semibold text-slate-200 truncate">{{ p.nombre }}</h3>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    [class]="p.estaActiva ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20'">
                {{ p.estaActiva ? 'Activa' : 'Borrador' }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500">v{{ p.version }} · {{ p.calles.length }} calles</p>
          </div>
        }
      </aside>

      <main class="flex-1 relative bg-slate-950">
        @if (sel) {
          <div class="absolute top-0 left-0 right-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200">📐 {{ sel.nombre }}</span>
              <span class="text-xs text-slate-500">v{{ sel.version }}</span>
            </div>
            <div class="flex gap-2">
              <button (click)="guardarPolitica()" class="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">💾 Guardar</button>
              @if (!sel.estaActiva) {
                <button (click)="activarPolitica()" class="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">🚀 Publicar</button>
              }
            </div>
          </div>

          <div class="pt-16 p-8 h-full overflow-auto space-y-4">
            <!-- Calles y actividades -->
            @for (calle of sel.calles; track calle.id; let ci = $index) {
              <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">🏢 {{ calle.nombre }}</h3>
                <div class="flex flex-wrap gap-3">
                  @for (act of calle.actividades; track act.id; let ai = $index) {
                    <div (click)="abrirEditarActividad(ci, ai)"
                         class="px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer hover:ring-2 hover:ring-indigo-500/30 transition-all"
                         [class]="getActCls(act.tipo)">
                      <span class="mr-1.5">{{ getActIcon(act.tipo) }}</span>
                      {{ act.nombre }}
                    </div>
                  }
                </div>
              </div>
            }
            <!-- Transiciones -->
            @if (sel.transiciones.length > 0) {
              <div class="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">🔗 Transiciones</h3>
                <div class="space-y-2">
                  @for (t of sel.transiciones; track t.id) {
                    <div class="flex items-center gap-2 text-xs text-slate-400">
                      <span class="font-mono bg-slate-800 px-2 py-0.5 rounded">{{ getNombreActividad(t.origenId) }}</span>
                      <span>→</span>
                      <span class="font-mono bg-slate-800 px-2 py-0.5 rounded">{{ getNombreActividad(t.destinoId) }}</span>
                      <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            [class]="t.tipoRuta === 'SECUENCIAL' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'">{{ t.tipoRuta }}</span>
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
              <p class="text-sm text-slate-500 font-medium">Selecciona o crea una política</p>
            </div>
          </div>
        }
      </main>

      <!-- MODAL CREAR POLÍTICA -->
      @if (mostrarModalCrear) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
            <h3 class="text-lg font-bold mb-4">Crear Nueva Política</h3>
            @if (errorCrear) { <div class="mb-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{{ errorCrear }}</div> }
            <div class="space-y-3">
              <div><label class="block text-xs font-semibold text-slate-400 mb-1">Nombre *</label>
                <input [(ngModel)]="nuevaPolitica.nombre" placeholder="Ej. Aprobación de Créditos" class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"></div>
              <div><label class="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
                <textarea [(ngModel)]="nuevaPolitica.descripcion" rows="3" placeholder="Describe el flujo de trabajo..." class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all resize-none"></textarea></div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="mostrarModalCrear = false" class="px-4 py-2 text-sm text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="crearPolitica()" class="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">Crear</button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL EDITAR ACTIVIDAD + FORM BUILDER -->
      @if (editandoActividad) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-bold mb-4">Editar Actividad</h3>
            <div class="grid grid-cols-2 gap-3 mb-6">
              <div><label class="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input [(ngModel)]="editAct.nombre" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all"></div>
              <div><label class="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                <select [(ngModel)]="editAct.tipo" class="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all">
                  <option value="INICIO">Inicio</option><option value="TAREA">Tarea</option><option value="DECISION">Decisión</option>
                  <option value="FORK">Fork</option><option value="JOIN">Join</option><option value="FIN">Fin</option>
                </select></div>
            </div>

            <!-- Form Builder -->
            <div class="border-t border-slate-800 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-slate-300">📋 Formulario Dinámico</h4>
                <button (click)="agregarCampo()" class="px-3 py-1 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-all">+ Campo</button>
              </div>
              @if (campos.length === 0) {
                <p class="text-xs text-slate-500 py-4 text-center">Sin campos. Agrega campos para el formulario del funcionario.</p>
              }
              @for (campo of campos; track $index; let i = $index) {
                <div class="flex items-center gap-2 mb-2">
                  <input [(ngModel)]="campo.label" placeholder="Etiqueta del campo" class="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-all">
                  <select [(ngModel)]="campo.type" class="w-28 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 outline-none">
                    <option value="text">Texto</option><option value="number">Número</option><option value="date">Fecha</option>
                    <option value="email">Email</option><option value="textarea">Área de texto</option><option value="file">Archivo</option>
                    <option value="select">Selección</option>
                  </select>
                  <label class="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="campo.required" class="rounded border-slate-600 bg-slate-800 text-indigo-500"> Req.
                  </label>
                  <button (click)="campos.splice(i, 1)" class="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-all">🗑️</button>
                </div>
              }
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button (click)="editandoActividad = false" class="px-4 py-2 text-sm text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
              <button (click)="guardarActividad()" class="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-xl shadow-lg shadow-indigo-500/20 transition-all">Guardar</button>
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

  editandoActividad = false;
  editCalleIdx = 0;
  editActIdx = 0;
  editAct: any = {};
  campos: CampoFormulario[] = [];

  constructor(public politicaService: PoliticaService, private auth: AuthService) {}

  ngOnInit(): void { this.cargarPoliticas(); }

  cargarPoliticas(): void {
    const tid = this.auth.usuario()?.tenantId;
    if (tid) this.politicaService.listarPorTenant(tid).subscribe();
  }

  seleccionar(p: PoliticaDTO): void { this.sel = JSON.parse(JSON.stringify(p)); }

  crearPolitica(): void {
    this.errorCrear = '';
    const tid = this.auth.usuario()?.tenantId;
    if (!tid || !this.nuevaPolitica.nombre) { this.errorCrear = 'El nombre es obligatorio.'; return; }
    this.politicaService.crear({ tenantId: tid, nombre: this.nuevaPolitica.nombre, descripcion: this.nuevaPolitica.descripcion } as any).subscribe({
      next: () => { this.mostrarModalCrear = false; this.nuevaPolitica = { nombre: '', descripcion: '' }; this.cargarPoliticas(); },
      error: (e) => this.errorCrear = e.error?.message || 'Error al crear.',
    });
  }

  abrirEditarActividad(ci: number, ai: number): void {
    this.editCalleIdx = ci;
    this.editActIdx = ai;
    const act = this.sel!.calles[ci].actividades[ai];
    this.editAct = { nombre: act.nombre, tipo: act.tipo };
    this.campos = act.esquemaFormulario ? [...(act.esquemaFormulario as any).campos || []] : [];
    this.editandoActividad = true;
  }

  agregarCampo(): void { this.campos.push({ label: '', type: 'text', required: false }); }

  guardarActividad(): void {
    const act = this.sel!.calles[this.editCalleIdx].actividades[this.editActIdx];
    act.nombre = this.editAct.nombre;
    act.tipo = this.editAct.tipo;
    act.esquemaFormulario = { campos: [...this.campos] };
    this.editandoActividad = false;
  }

  guardarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.actualizar(this.sel.id, this.sel).subscribe({
      next: (updated) => { this.sel = JSON.parse(JSON.stringify(updated)); this.cargarPoliticas(); },
      error: () => {},
    });
  }

  activarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.activar(this.sel.id).subscribe({
      next: (updated) => { this.sel = JSON.parse(JSON.stringify(updated)); this.cargarPoliticas(); },
    });
  }

  getNombreActividad(id: string): string {
    for (const c of this.sel?.calles || []) {
      const act = c.actividades.find((a: any) => a.id === id);
      if (act) return act.nombre;
    }
    return id.substring(0, 8);
  }

  getActIcon(t: string): string { return ({ INICIO: '🟢', FIN: '🔴', TAREA: '📄', DECISION: '🔶', FORK: '🔀', JOIN: '🔁' } as any)[t] || '⬜'; }
  getActCls(t: string): string {
    return ({ INICIO: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', FIN: 'border-red-500/30 bg-red-500/10 text-red-400', DECISION: 'border-amber-500/30 bg-amber-500/10 text-amber-400', FORK: 'border-purple-500/30 bg-purple-500/10 text-purple-400', JOIN: 'border-purple-500/30 bg-purple-500/10 text-purple-400' } as any)[t] || 'border-slate-700 bg-slate-800/60 text-slate-200';
  }
}

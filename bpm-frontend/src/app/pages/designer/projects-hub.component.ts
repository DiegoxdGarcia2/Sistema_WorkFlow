import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProyectoService } from '../../services/proyecto.service';
import { PoliticaService } from '../../services/politica.service';
import { AuthService } from '../../services/auth.service';
import { AdminService, UsuarioListDTO } from '../../services/admin.service';
import { ProyectoDTO, PoliticaDTO } from '../../models/bpm.models';
import { effect, computed, signal } from '@angular/core';

@Component({
  selector: 'app-projects-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; min-height: calc(100vh - 4rem); }
    .card-hover { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
    .card-hover:hover { transform: translateY(-4px); }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `],
  template: `
    <div class="min-h-full bg-premium text-slate-100 font-sans">
      <!-- Header -->
      <div class="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 ring-1 ring-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            </div>
            <div>
              <h1 class="text-xl font-extrabold tracking-tight text-white">Workflow Designer</h1>
              <p class="text-xs text-slate-500 font-medium">Proyectos y Políticas de Negocio</p>
            </div>
          </div>
          <button (click)="mostrarModalCrear = true"
                  class="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nuevo Proyecto
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-7xl mx-auto px-8 py-8">
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 ring-1 ring-white/5">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            </div>
            <div><p class="text-2xl font-bold">{{ proyectoService.proyectos().length }}</p><p class="text-xs text-slate-500">Proyectos</p></div>
          </div>
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 ring-1 ring-white/5">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div><p class="text-2xl font-bold">{{ totalPoliticas() }}</p><p class="text-xs text-slate-500">Políticas Totales</p></div>
          </div>
          <div class="flex items-center gap-4 p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 ring-1 ring-white/5">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div><p class="text-2xl font-bold">{{ politicasActivas() }}</p><p class="text-xs text-slate-500">Políticas Activas</p></div>
          </div>
        </div>

        <!-- Project cards grid -->
        @if (proyectoService.proyectos().length === 0 && !cargando) {
          <div class="text-center py-24">
            <div class="w-20 h-20 mx-auto rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl ring-1 ring-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="M9 13h6"/></svg>
            </div>
            <h2 class="text-lg font-bold text-slate-300 mb-2">Sin proyectos aún</h2>
            <p class="text-sm text-slate-500 max-w-sm mx-auto mb-6">Crea tu primer proyecto para organizar tus políticas de negocio y flujos de trabajo.</p>
            <button (click)="mostrarModalCrear = true" class="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all">
              Crear Primer Proyecto
            </button>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (p of proyectoService.proyectos(); track p.id) {
            <div (click)="abrirProyecto(p)" class="card-hover group relative rounded-2xl border border-slate-800/60 bg-slate-900/40 ring-1 ring-white/5 cursor-pointer overflow-hidden">
              <!-- Color bar -->
              <div class="h-1.5 w-full" [style.background]="p.color"></div>
              <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" [style.background]="p.color + '20'" [style.color]="p.color">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                  </div>
                  <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        [class]="p.estado === 'ACTIVO' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-slate-700/40 text-slate-500 ring-1 ring-slate-700/40'">
                    {{ p.estado }}
                  </span>
                </div>
                <h3 class="text-base font-bold text-slate-100 mb-1 group-hover:text-white transition-colors">{{ p.nombre }}</h3>
                <p class="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2rem]">{{ p.descripcion || 'Sin descripción' }}</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3 text-[10px] text-slate-600">
                    @if (p.responsable) {
                      <span class="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {{ p.responsable }}
                      </span>
                    }
                    <span class="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                      {{ contarPoliticasProyecto(p.id) }} políticas
                    </span>
                  </div>
                  <button (click)="editarProyecto(p, $event)" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-300" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- Sin proyecto: políticas sueltas -->
          @if (politicasSinProyecto().length > 0) {
            <div (click)="abrirSinProyecto()" class="card-hover group relative rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/20 ring-1 ring-white/5 cursor-pointer overflow-hidden">
              <div class="h-1.5 w-full bg-slate-700"></div>
              <div class="p-6">
                <div class="w-11 h-11 rounded-xl bg-slate-800/50 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <h3 class="text-base font-bold text-slate-400 mb-1">Sin Proyecto</h3>
                <p class="text-xs text-slate-600 mb-4">Políticas no asignadas a ningún proyecto.</p>
                <span class="text-[10px] text-slate-600">{{ politicasSinProyecto().length }} políticas</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- ══════════ MODAL: Crear/Editar Proyecto ══════════ -->
      @if (mostrarModalCrear) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div class="w-full max-w-lg rounded-3xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-7 ring-1 ring-white/10">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">{{ editandoProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto' }}</h3>
                <p class="text-[11px] text-slate-500">Organiza tus políticas de negocio.</p>
              </div>
            </div>
            @if (errorProyecto) {
              <div class="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errorProyecto }}
              </div>
            }
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre *</label>
                <input [(ngModel)]="formProyecto.nombre" placeholder="Ej. Gestión de Créditos" class="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
                <textarea [(ngModel)]="formProyecto.descripcion" rows="3" placeholder="Describe el propósito de este proyecto..." class="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none"></textarea>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Responsable del Proyecto *</label>
                <div class="relative group">
                  <select [(ngModel)]="formProyecto.responsable"
                          class="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none">
                    <option value="">Seleccionar Diseñador...</option>
                    @for (d of disenadores(); track d.id) {
                      <option [value]="d.nombre + ' ' + d.apellido">{{ d.nombre }} {{ d.apellido }}</option>
                    }
                  </select>
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Color del Proyecto</label>
                <div class="flex items-center gap-2 flex-wrap">
                  @for (c of coloresProyecto; track c) {
                    <button (click)="formProyecto.color = c" class="w-9 h-9 rounded-xl transition-all hover:scale-110" [style.background]="c"
                            [class]="formProyecto.color === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 scale-110' : 'ring-1 ring-white/10'"
                            [style.ring-color]="formProyecto.color === c ? c : ''"></button>
                  }
                </div>
              </div>
            </div>
            <div class="flex justify-between items-center mt-7">
              <div>
                @if (editandoProyecto) {
                  <button (click)="eliminarProyecto()" class="px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all">Eliminar</button>
                }
              </div>
              <div class="flex gap-3">
                <button (click)="cerrarModalProyecto()" class="px-5 py-2.5 text-sm font-medium text-slate-400 rounded-xl hover:bg-slate-800 transition-all">Cancelar</button>
                <button (click)="guardarProyecto()" class="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/25 transition-all">
                  {{ editandoProyecto ? 'Guardar' : 'Crear' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ProjectsHubComponent implements OnInit {
  mostrarModalCrear = false;
  editandoProyecto: ProyectoDTO | null = null;
  errorProyecto = '';
  cargando = true;

  formProyecto = { nombre: '', descripcion: '', responsable: '', color: '#6366f1' };
  coloresProyecto = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#475569'];

  allPoliticas = signal<PoliticaDTO[]>([]);
  politicasSinProyecto = signal<PoliticaDTO[]>([]);
  disenadores = signal<UsuarioListDTO[]>([]);

  totalPoliticas = computed(() => this.allPoliticas().length);
  politicasActivas = computed(() => this.allPoliticas().filter(p => p.estaActiva).length);

  constructor(
    public proyectoService: ProyectoService,
    private politicaService: PoliticaService,
    private auth: AuthService,
    private adminService: AdminService,
    private router: Router,
  ) {
    // Reaccionar a cambios en el usuario
    effect(() => {
      const user = this.auth.usuario();
      if (user?.tenantId) {
        this.cargarDatos(user.tenantId);
      }
    });
  }

  ngOnInit(): void {
    const user = this.auth.usuario();
    if (user?.tenantId) {
      this.cargarDatos(user.tenantId);
    }
  }

  private cargarDatos(tid: string): void {
    this.cargando = true;
    this.proyectoService.listarPorTenant(tid).subscribe({
      next: () => this.cargando = false,
      error: () => this.cargando = false
    });

    this.politicaService.listarPorTenant(tid).subscribe({
      next: pols => {
        this.allPoliticas.set(pols);
        this.politicasSinProyecto.set(pols.filter(p => !p.proyectoId));
      }
    });

    this.adminService.getUsuariosPorRol(tid, 'DISENADOR').subscribe({
      next: users => this.disenadores.set(users)
    });
  }

  contarPoliticasProyecto(proyectoId: string): number {
    return this.allPoliticas().filter(p => p.proyectoId === proyectoId).length;
  }

  abrirProyecto(p: ProyectoDTO): void {
    this.router.navigate(['/designer/editor'], { queryParams: { projectId: p.id, projectName: p.nombre } });
  }

  abrirSinProyecto(): void {
    this.router.navigate(['/designer/editor']);
  }

  editarProyecto(p: ProyectoDTO, event: MouseEvent): void {
    event.stopPropagation();
    this.editandoProyecto = p;
    this.formProyecto = { nombre: p.nombre, descripcion: p.descripcion || '', responsable: p.responsable || '', color: p.color || '#6366f1' };
    this.mostrarModalCrear = true;
  }

  guardarProyecto(): void {
    this.errorProyecto = '';
    const tid = this.auth.usuario()?.tenantId;
    if (!tid || !this.formProyecto.nombre.trim()) { this.errorProyecto = 'El nombre es obligatorio.'; return; }

    if (this.editandoProyecto) {
      this.proyectoService.actualizar(this.editandoProyecto.id, { ...this.formProyecto, tenantId: tid } as any).subscribe({
        next: () => { this.cerrarModalProyecto(); this.ngOnInit(); },
        error: (e) => this.errorProyecto = e.error?.message || 'Error al actualizar.',
      });
    } else {
      this.proyectoService.crear({ ...this.formProyecto, tenantId: tid } as any).subscribe({
        next: () => { this.cerrarModalProyecto(); this.ngOnInit(); },
        error: (e) => this.errorProyecto = e.error?.message || 'Error al crear.',
      });
    }
  }

  eliminarProyecto(): void {
    if (!this.editandoProyecto) return;
    this.proyectoService.eliminar(this.editandoProyecto.id).subscribe({
      next: () => { this.cerrarModalProyecto(); this.ngOnInit(); },
      error: (e) => this.errorProyecto = e.error?.message || 'Error al eliminar.',
    });
  }

  cerrarModalProyecto(): void {
    this.mostrarModalCrear = false;
    this.editandoProyecto = null;
    this.errorProyecto = '';
    this.formProyecto = { nombre: '', descripcion: '', responsable: '', color: '#6366f1' };
  }
}

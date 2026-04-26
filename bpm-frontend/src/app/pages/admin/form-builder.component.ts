import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormularioService, FormularioTemplate, CampoFormulario } from '../../services/formulario.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">Plantillas de Formularios</h2>
          <p class="text-slate-500 text-sm">Crea y gestiona estructuras de datos reutilizables.</p>
        </div>
        <button (click)="nuevoTemplate()" class="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nueva Plantilla
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (t of fs.templates(); track t.id) {
          <div class="glass p-6 rounded-[2rem] hover:border-indigo-500/50 transition-all group relative overflow-hidden">
            <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
              <button (click)="editarTemplate(t)" class="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
              <button (click)="eliminarTemplate(t.id!)" class="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h3 class="text-lg font-bold text-white mb-1">{{ t.nombre }}</h3>
            <p class="text-slate-500 text-xs line-clamp-2 mb-4">{{ t.descripcion || 'Sin descripción' }}</p>
            <div class="flex items-center gap-2">
              <span class="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-400 font-bold uppercase tracking-wider">{{ t.campos.length }} Campos</span>
            </div>
          </div>
        } @empty {
          <div class="col-span-full py-20 text-center glass rounded-[3rem]">
            @if (error) {
              <div class="flex flex-col items-center gap-4 animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p class="text-red-400 font-bold">{{ error }}</p>
                <button (click)="ngOnInit()" class="text-xs text-indigo-400 hover:underline">Reintentar conexión</button>
              </div>
            } @else {
              <p class="text-slate-500 font-medium">No hay plantillas creadas todavía.</p>
            }
          </div>
        }
      </div>

      <!-- MODAL EDITOR -->
      @if (mostrarModal) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div class="w-full max-w-4xl max-h-[90vh] glass rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in fade-in duration-300">
            <!-- Header -->
            <div class="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h2 class="text-xl font-black text-white">{{ editandoId ? 'Editar Plantilla' : 'Nueva Plantilla' }}</h2>
                <p class="text-xs text-slate-500 mt-1">Configura los campos y reglas del formulario.</p>
              </div>
              <button (click)="mostrarModal = false" class="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/5 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div class="grid grid-cols-3 gap-10">
                <!-- Info Básica -->
                <div class="col-span-1 space-y-6">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre de Plantilla</label>
                    <input [(ngModel)]="template.nombre" placeholder="Ej. Solicitud de Vacaciones" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-white/5 text-sm text-white focus:border-indigo-500 outline-none transition-all">
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción</label>
                    <textarea [(ngModel)]="template.descripcion" rows="4" placeholder="¿Para qué sirve este formulario?" class="w-full px-5 py-4 rounded-2xl bg-slate-800/40 border border-white/5 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none"></textarea>
                  </div>
                </div>

                <!-- Campos -->
                <div class="col-span-2 space-y-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-sm font-bold text-slate-300">Campos del Formulario</h3>
                    <button (click)="agregarCampo()" class="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      Añadir Campo
                    </button>
                  </div>

                  <div class="space-y-4">
                    @for (c of template.campos; track $index) {
                      @let i = $index;
                      <div class="p-5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-4 group relative">
                        <div class="flex-1 grid grid-cols-2 gap-4">
                          <div class="col-span-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Etiqueta (Label)</label>
                            <input [(ngModel)]="c.label" placeholder="Ej. Fecha de Salida" (input)="c.key = slugify(c.label)" class="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-white outline-none">
                          </div>
                          <div class="col-span-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Tipo de Dato</label>
                            <select [(ngModel)]="c.type" class="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-white outline-none">
                              <option value="text">Texto Corto</option>
                              <option value="textarea">Texto Largo</option>
                              <option value="number">Número</option>
                              <option value="date">Fecha</option>
                              <option value="select">Selección (Dropdown)</option>
                              <option value="file">Archivo (PDF, Imagen)</option>
                            </select>
                          </div>
                          @if (c.type === 'select') {
                            <div class="col-span-2">
                              <label class="text-[9px] font-bold text-slate-500 uppercase mb-1 block">Opciones (separadas por coma)</label>
                              <input [ngModel]="c.options?.join(', ')" (ngModelChange)="setOptions(c, $event)" placeholder="Opción 1, Opción 2..." class="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-white outline-none">
                            </div>
                          }
                          <div class="col-span-2 flex flex-wrap items-center gap-6">
                            <div class="flex items-center gap-2">
                              <input type="checkbox" [(ngModel)]="c.required" [id]="'req-'+i" class="w-4 h-4 rounded border-white/10 bg-slate-900">
                              <label [for]="'req-'+i" class="text-[10px] font-bold text-slate-400 uppercase cursor-pointer">Es obligatorio</label>
                            </div>
                            
                            @if (c.type === 'number') {
                              <div class="flex items-center gap-3">
                                <span class="text-[9px] font-bold text-slate-500 uppercase">Min</span>
                                <input type="number" [(ngModel)]="c.validations!.min" class="w-16 px-2 py-1 rounded bg-slate-900/50 border border-white/5 text-[10px] text-white outline-none">
                                <span class="text-[9px] font-bold text-slate-500 uppercase">Max</span>
                                <input type="number" [(ngModel)]="c.validations!.max" class="w-16 px-2 py-1 rounded bg-slate-900/50 border border-white/5 text-[10px] text-white outline-none">
                              </div>
                            }
                            
                            @if (c.type === 'text' || c.type === 'textarea') {
                              <div class="flex items-center gap-3">
                                <span class="text-[9px] font-bold text-slate-500 uppercase">Regex</span>
                                <input [(ngModel)]="c.validations!.pattern" placeholder="^[0-9]+$" class="w-32 px-2 py-1 rounded bg-slate-900/50 border border-white/5 text-[10px] text-white outline-none">
                              </div>
                            }
                          </div>
                        </div>
                        <button (click)="removerCampo(i)" class="mt-6 p-2 text-slate-600 hover:text-red-400 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="px-10 py-8 border-t border-white/5 bg-white/[0.02] flex gap-4">
              <button (click)="mostrarModal = false" class="flex-1 py-4 text-sm font-bold text-slate-500 hover:text-white transition-all">Descartar</button>
              <button (click)="guardar()" class="flex-[2] py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .glass { background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  `]
})
export class FormBuilderComponent implements OnInit {
  error = '';
  mostrarModal = false;
  editandoId: string | null = null;
  template!: FormularioTemplate;

  constructor(public fs: FormularioService, public auth: AuthService) {}

  ngOnInit() {
    this.error = '';
    this.template = this.limpiarTemplate();
    const tid = this.auth.usuario()?.tenantId;
    if (tid) {
      this.fs.listarPorTenant(tid).subscribe({
        error: (err) => {
          this.error = 'Error de conexión con el servidor (CORS o Red).';
          console.error(err);
        }
      });
    }
  }

  limpiarTemplate(): FormularioTemplate {
    return {
      tenantId: this.auth?.usuario()?.tenantId || '',
      nombre: '',
      descripcion: '',
      campos: []
    };
  }

  nuevoTemplate() {
    this.editandoId = null;
    this.template = this.limpiarTemplate();
    this.mostrarModal = true;
  }

  editarTemplate(t: FormularioTemplate) {
    this.editandoId = t.id!;
    // Deep clone to avoid modifying the signal-managed reference until save
    this.template = JSON.parse(JSON.stringify(t));
    
    // Ensure all fields have a validations object (even if empty) to avoid null pointers in template
    this.template.campos.forEach(c => { 
      if (!c.validations) {
        c.validations = {}; 
      }
    });
    this.mostrarModal = true;
  }

  agregarCampo() {
    this.template.campos.push({
      key: 'campo_' + Date.now(),
      label: '',
      type: 'text',
      required: false,
      validations: {}
    });
  }

  removerCampo(i: number) {
    this.template.campos.splice(i, 1);
  }

  setOptions(c: CampoFormulario, val: string) {
    c.options = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  slugify(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  }

  guardar() {
    if (!this.template.nombre) return;
    const obs = this.editandoId 
      ? this.fs.actualizar(this.editandoId, this.template)
      : this.fs.crear(this.template);

    obs.subscribe(() => {
      this.mostrarModal = false;
      this.fs.listarPorTenant(this.template.tenantId).subscribe();
    });
  }

  eliminarTemplate(id: string) {
    if (confirm('¿Seguro que deseas eliminar esta plantilla?')) {
      this.fs.eliminar(id).subscribe(() => {
        this.fs.listarPorTenant(this.auth.usuario()!.tenantId).subscribe();
      });
    }
  }
}

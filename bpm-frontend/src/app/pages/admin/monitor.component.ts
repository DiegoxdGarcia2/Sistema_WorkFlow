import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <!-- TABS -->
      <div class="flex items-center gap-2 p-1.5 bg-slate-900/60 rounded-2xl w-fit border border-slate-800/60">
        <button (click)="tab.set('live')" [class]="tab() === 'live' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'" class="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">En Vivo</button>
        <button (click)="tab.set('history')" [class]="tab() === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'" class="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Historial de Finalizados</button>
      </div>

      <!-- HEADER STATS (Only in Live) -->
      <div *ngIf="tab() === 'live'" class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl ring-1 ring-white/5">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Trámites Activos</p>
          <p class="text-3xl font-black text-white">{{ tramites().length }}</p>
          <div class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-500 w-[70%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
          </div>
        </div>
        <div class="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl ring-1 ring-white/5">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Carga por Depto</p>
          <p class="text-3xl font-black text-amber-400">{{ getMaxCargaDepto() }}</p>
          <p class="text-[10px] text-slate-500 mt-1 font-bold">Máximo en {{ getNombreDeptoMax() }}</p>
        </div>
        <div class="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl ring-1 ring-white/5">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Eficiencia Global</p>
          <p class="text-3xl font-black text-sky-400">92%</p>
          <p class="text-[10px] text-green-500 mt-1 font-bold">↑ 4% este mes</p>
        </div>
        <div class="p-6 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-xl ring-1 ring-white/5">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cuellos de Botella</p>
          <p class="text-3xl font-black text-red-500">{{ getBottlenecks().length }}</p>
          <p class="text-[10px] text-slate-500 mt-1 font-bold">Tareas con +2h</p>
        </div>
      </div>

      <!-- LISTS -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        @let listado = tab() === 'live' ? tramites() : historial();
        @for (t of listado; track t.tramiteId) {
          <div (click)="verMonitor(t)" class="p-8 rounded-[2.5rem] border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 group transition-all hover:ring-indigo-500/30 overflow-hidden relative cursor-pointer">
            <!-- Badge Estado -->
            <div class="absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[9px] font-black uppercase tracking-widest"
                 [class]="t.estadoGeneral === 'COMPLETADO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'">
              {{ t.estadoGeneral }}
            </div>

            <div class="flex items-start justify-between mb-6 pr-16">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                </div>
                <div>
                  <h3 class="text-lg font-black text-white tracking-tight">{{ t.politicaNombre }}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-mono text-slate-500">REF: {{ t.tramiteId.substring(0,8) }}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span class="text-[10px] text-slate-400">{{ t.iniciadoEn | date:'short' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ tab() === 'live' ? 'Tareas Actuales' : 'Historial de Pasos' }}</span>
                <div class="h-px flex-1 bg-slate-800"></div>
              </div>
              
              @for (paso of t.pasosActuales; track paso.registroId) {
                <div class="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all group/step">
                  <div class="flex items-center gap-5">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center border transition-all bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                      <p class="text-sm font-bold text-white group-hover/step:text-indigo-400 transition-colors">{{ paso.actividadNombre }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{{ paso.calleNombre }}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span class="text-[10px] text-slate-400">{{ paso.asignadoA || 'N/A' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] font-bold text-slate-500 uppercase">{{ paso.estado }}</span>
                  </div>
                </div>
              }
            </div>

            <div class="mt-6 flex justify-end gap-3 relative z-20">
              <button *ngIf="tab() === 'live'" 
                      (click)="$event.stopPropagation(); cancelar(t.tramiteId)" 
                      [disabled]="cancelingId() === t.tramiteId"
                      class="px-5 py-2 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      [ngClass]="cancelingId() === t.tramiteId ? 'text-slate-400 border-slate-600 bg-slate-800' : 'text-slate-300 border-slate-600 hover:bg-red-600 hover:text-white hover:border-red-500'">
                {{ cancelingId() === t.tramiteId ? 'CANCELANDO...' : 'CANCELAR PROCESO' }}
              </button>
              <button class="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 rounded-xl hover:bg-indigo-500 hover:text-white transition-all cursor-pointer">
                Ver Auditoría Completa
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-2 py-24 text-center rounded-[3rem] border border-dashed border-slate-800 bg-slate-900/20">
            <h4 class="text-xl font-bold text-slate-400">Sin registros</h4>
            <p class="text-sm text-slate-600 mt-2">No se encontraron trámites en esta categoría.</p>
          </div>
        }
      </div>

      <!-- MODAL DETALLE AUDITORIA -->
      @if (detalleTramite) {
        <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div class="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
            <div class="p-10 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-black text-white tracking-tight">Auditoría de Proceso</h2>
                <p class="text-xs text-slate-500 mt-1 uppercase tracking-widest">Línea de tiempo y documentos adjuntos.</p>
              </div>
              <button (click)="cerrarAuditoria()" class="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/5 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-10 custom-scrollbar animate-in slide-in-from-bottom-4 duration-500">
              @if (loadingAudit()) {
                <div class="flex flex-col items-center justify-center py-24 animate-pulse">
                  <div class="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
                  <h3 class="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Consultando historial...</h3>
                </div>
              } @else if (timeline().length === 0) {
                <div class="py-20 text-center">
                  <div class="text-4xl mb-4 opacity-20">🔍</div>
                  <p class="text-slate-500 font-medium">No se encontraron registros de auditoría.</p>
                  <p class="text-slate-600 text-[10px] uppercase tracking-widest mt-2">Es posible que el proceso acabe de iniciar.</p>
                </div>
              } @else {
                <div class="space-y-12 relative before:absolute before:left-[1.35rem] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                  @for (p of timeline(); track p.registroId || $index) {
                    <div class="flex gap-8 relative">
                      @if (!$last) { <div class="absolute left-6 top-10 bottom-[-2rem] w-0.5 bg-slate-800"></div> }
                      
                      <div class="w-12 h-12 rounded-2xl flex items-center justify-center z-10 shrink-0 shadow-lg"
                           [class]="p.estado === 'COMPLETADO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>

                      <div class="flex-1 pt-1 pb-8">
                        <div class="flex items-center justify-between mb-4">
                          <div>
                            <h3 class="text-lg font-black text-white tracking-tight">{{ p.actividadNombre }}</h3>
                            <p class="text-[10px] text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                              <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                              {{ p.ejecutadoPor || 'Pendiente' }}
                              <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                              {{ p.completadoEn ? (p.completadoEn | date:'short') : 'En curso' }}
                            </p>
                          </div>
                          <span class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                [class]="p.estado === 'COMPLETADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'">
                            {{ p.estado }}
                          </span>
                        </div>

                        @if (p.notas) {
                          <div class="mb-6 p-5 rounded-3xl bg-slate-800/40 border border-white/5 relative italic">
                            <p class="text-xs text-slate-400 leading-relaxed">"{{ p.notas }}"</p>
                          </div>
                        }

                        @if (p.datosFormulario && (((p.datosFormulario | keyvalue) || []).length > 0)) {
                          <div class="mb-6 p-6 rounded-3xl bg-white/[0.03] border border-white/5">
                            <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Información Registrada</p>
                            <div class="grid grid-cols-2 gap-4 mt-6">
                              @for (item of (p.datosFormulario | keyvalue); track item.key) {
                                <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group/field">
                                  <div class="flex items-center gap-2">
                                    <span class="text-[9px] font-bold text-slate-500 uppercase">{{ getFieldLabel(item.key, p) }}</span>
                                    <span *ngIf="isExtraField(item.key.toString())" class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-tighter">Extra</span>
                                  </div>
                                  @if (item.value && item.value.id && item.value.path) {
                                    <a [href]="item.value.path" target="_blank" class="text-xs text-indigo-400 hover:underline font-bold mt-1 flex items-center gap-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                      {{ item.value.nombre }}
                                    </a>
                                  } @else {
                                    <span class="text-xs text-slate-300 font-medium mt-0.5">{{ item.value }}</span>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }

                        @if (p.archivos && p.archivos.length > 0) {
                          <div class="space-y-2">
                            <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Documentación Adjunta</p>
                            <div class="grid grid-cols-2 gap-3">
                              @for (file of p.archivos; track file.id) {
                                <a [href]="file.path || file.url || '/api/archivos/download/' + file.id" target="_blank"
                                   class="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-3 hover:bg-indigo-500/10 transition-all group/file">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  <div class="min-w-0">
                                    <p class="text-[11px] font-bold text-slate-300 truncate group-hover/file:text-indigo-300">{{ file.nombreOriginal || file.nombre }}</p>
                                    <p class="text-[9px] text-slate-500 uppercase">{{ (file.tamano || file.tamanio || file.size || 0) / 1024 | number:'1.0-0' }} KB</p>
                                  </div>
                                </a>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TOAST NOTIFICATION -->
      @if (toastMessage()) {
        <div class="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div class="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            <span class="font-bold text-sm tracking-wide">{{ toastMessage() }}</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class MonitorComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private http = inject(HttpClient);
  
  tab = signal<'live' | 'history'>('live');
  tramites = signal<any[]>([]);
  historial = signal<any[]>([]);
  
  detalleTramite: any = null;
  timeline = signal<any[]>([]);
  loadingAudit = signal<boolean>(false);

  constructor(
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarDatos();
    setInterval(() => {
      if (this.tab() === 'live') this.cargarDatos();
    }, 15000);
  }

  cargarDatos() {
    const tenantId = this.auth.usuario()?.tenantId;
    if (!tenantId) return;

    if (this.tab() === 'live') {
      this.adminSvc.monitorTramites(tenantId).subscribe(data => this.tramites.set(data));
    } else {
      this.adminSvc.cargarHistorialTramites(tenantId).subscribe(data => this.historial.set(data));
    }
  }

  onTabChange = effect(() => {
    this.cargarDatos();
  });

  verMonitor(t: any) {
    if (!t?.tramiteId) {
      console.warn('No se puede consultar auditoría: tramiteId no definido', t);
      return;
    }
    this.detalleTramite = t;
    this.timeline.set([]);
    this.loadingAudit.set(true);
    
    this.adminSvc.obtenerTracking(t.tramiteId).pipe(
      finalize(() => this.loadingAudit.set(false))
    ).subscribe({
      next: (data) => {
        try {
          const tl = data?.timeline || [];
          this.timeline.set(tl);
          console.log('✅ Historial cargado:', tl.length, 'pasos');
        } catch (err) {
          console.error('❌ Error procesando timeline:', err);
          this.timeline.set([]);
        }
      },
      error: (err) => {
        console.error('❌ Error de red al obtener tracking:', err);
        this.timeline.set([]);
      }
    });
  }

  getFieldLabel(key: any, paso: any): string {
    const sKey = String(key);
    if (!paso?.esquemaFormulario) return sKey;
    const fields = (paso.esquemaFormulario as any).fields || [];
    const field = fields.find((f: any) => f.key === sKey);
    if (field) return field.label;
    
    // Si no está en el esquema pero empieza con extra_, limpiamos el nombre
    if (sKey.startsWith('extra_')) {
      const clean = sKey.replace('extra_', '').replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return sKey;
  }

  isExtraField(key: string): boolean {
    return key.startsWith('extra_');
  }

  cancelingId = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  cerrarAuditoria() {
    this.detalleTramite = null;
    this.timeline.set([]);
  }

  cancelar(id: string | undefined) {
    if (!id || this.cancelingId()) return;
    
    // Eliminado el 'confirm()' nativo porque el navegador lo está bloqueando silenciosamente
    this.cancelingId.set(id);
    this.adminSvc.cancelarTramite(id).subscribe({
      next: () => {
        this.cancelingId.set(null);
        this.mostrarToast('✅ Proceso cancelado exitosamente');
        this.cargarDatos();
      },
      error: (err) => {
        this.cancelingId.set(null);
        console.error('❌ Error al cancelar:', err);
        alert('Error al cancelar: ' + (err.status || 'Error de conexión'));
      }
    });
  }

  mostrarToast(mensaje: string) {
    this.toastMessage.set(mensaje);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3000);
  }

  getTimeElapsed(isoDate: string): string {
    if (!isoDate) return '0m';
    const start = new Date(isoDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  isBottleneck(paso: any): boolean {
    if (!paso.asignadoEn || paso.estado !== 'PENDIENTE') return false;
    const start = new Date(paso.asignadoEn).getTime();
    const now = new Date().getTime();
    return (now - start) > (2 * 60 * 60 * 1000);
  }

  getBottlenecks() {
    const list: any[] = [];
    this.tramites().forEach(t => {
      t.pasosActuales.forEach((p: any) => {
        if (this.isBottleneck(p)) list.push(p);
      });
    });
    return list;
  }

  getMaxCargaDepto(): number {
    const deptos: any = {};
    this.tramites().forEach(t => {
      t.pasosActuales.forEach((p: any) => {
        deptos[p.departamentoNombre] = (deptos[p.departamentoNombre] || 0) + 1;
      });
    });
    const values: number[] = Object.values(deptos);
    return values.length > 0 ? Math.max(...values) : 0;
  }

  getNombreDeptoMax(): string {
    const deptos: any = {};
    this.tramites().forEach(t => {
      t.pasosActuales.forEach((p: any) => {
        deptos[p.departamentoNombre] = (deptos[p.departamentoNombre] || 0) + 1;
      });
    });
    let max = 0;
    let name = 'N/A';
    for (const d in deptos) {
      if (deptos[d] > max) {
        max = deptos[d];
        name = d;
      }
    }
    return name;
  }
}

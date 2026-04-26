import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { PoliticaService } from '../../services/politica.service';
import { ArchivoService } from '../../services/archivo.service';
import {
  RegistroActividadDTO,
  CompletarTareaRequest,
  PoliticaDTO,
  TramiteDTO,
} from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';
import { FormularioService, FormularioTemplate } from '../../services/formulario.service';
import { KeyValuePipe } from '@angular/common';

@Component({
  selector: 'app-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; height: calc(100vh - 4rem); }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    .glass-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .btn-premium {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-premium:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(79, 70, 229, 0.4);
    }

    .form-input {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 10px 14px;
      font-size: 14px;
      color: #e2e8f0;
      width: 100%;
      outline: none;
      transition: all 0.2s;
    }
    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade { animation: fadeIn 0.4s ease-out forwards; }
  `],
  template: `
    <div class="flex h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      <!-- SIDEBAR -->
      <aside class="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        <div class="p-6 border-b border-slate-800/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
              <span class="text-xl">💼</span>
            </div>
            <div>
              <h2 class="text-sm font-black tracking-tight text-white uppercase">WorkSpace</h2>
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{{ deptoNombre }}</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 p-4 space-y-1">
          @for (item of menu; track item.view) {
            <button (click)="setVista(item.view)" class="nav-item" [class.active]="vista === item.view">
              <span class="w-5 h-5 flex items-center justify-center" [innerHTML]="item.safeSvg"></span>
              {{ item.label }}
            </button>
          }
        </nav>

        <div class="p-4 bg-slate-900/50 border-t border-slate-800">
          <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/50 border border-slate-800">
            <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">{{ auth.usuario()?.nombre?.charAt(0) }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold truncate">{{ auth.usuario()?.nombre }}</p>
              <p class="text-[9px] text-slate-500 truncate">{{ auth.usuario()?.email }}</p>
            </div>
            <button (click)="auth.logout()" class="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all" title="Cerrar Sesión">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 overflow-y-auto p-10 relative">
        <!-- HEADER -->
        <header class="flex items-center justify-between mb-10">
          <div class="flex items-center gap-6">
            <div class="w-16 h-16 rounded-[2rem] bg-indigo-500 shadow-2xl shadow-indigo-500/20 flex items-center justify-center text-white text-3xl font-black ring-4 ring-indigo-500/10">
              {{ auth.usuario()?.tenantNombre?.charAt(0) }}
            </div>
            <div>
              <h1 class="text-3xl font-black tracking-tighter text-white">{{ getTitulo() }}</h1>
              <div class="flex items-center gap-3 mt-1.5">
                <div class="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-indigo-300">{{ deptoNombre }}</span>
                </div>
                <span class="w-1 h-1 rounded-full bg-slate-800"></span>
                <p class="text-slate-500 text-sm font-medium">{{ getSubtitulo() }}</p>
              </div>
            </div>
          </div>
          <div class="flex gap-4">
             <div class="px-6 py-3 rounded-[1.5rem] border border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center gap-8 shadow-xl ring-1 ring-white/5">
                <div class="text-center">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Tareas Hoy</p>
                   <p class="text-xl font-black text-white leading-none">{{ getRendimiento().completadasHoy }}</p>
                </div>
                <div class="w-px h-10 bg-slate-800"></div>
                <div class="text-center">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Eficiencia</p>
                   <p class="text-xl font-black text-indigo-400 leading-none">94%</p>
                </div>
             </div>
          </div>
        </header>

        <!-- VIEWS -->
        <div class="animate-fade">
          
          <!-- LOADING STATE -->
          @if (cargando()) {
            <div class="py-32 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
               <div class="w-20 h-20 relative mb-8">
                  <div class="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping"></div>
                  <div class="relative w-full h-full rounded-3xl bg-slate-900 border border-indigo-500/30 flex items-center justify-center">
                     <div class="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  </div>
               </div>
               <h3 class="text-xl font-black text-white tracking-tighter uppercase mb-2">Consultando {{ getTitulo() }}</h3>
               <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Sincronizando con el servidor en tiempo real</p>
            </div>
          } @else {
            
            <!-- BANDEJA / DISPONIBLES -->
            @if (vista === 'bandeja' || vista === 'disponible') {
              <div class="grid grid-cols-1 gap-4">
                 @if (getTareas().length === 0) {
                   <div class="py-20 text-center glass-card rounded-3xl">
                      <div class="text-5xl mb-4 opacity-20">📭</div>
                      <p class="text-slate-400 font-medium">No hay tareas en esta bandeja</p>
                      <p class="text-slate-600 text-xs mt-1">¡Buen trabajo! Estás al día.</p>
                   </div>
                 }
                 @for (t of getTareas(); track t.id) {
                   <div class="glass-card p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/50 transition-all duration-300">
                      <div class="flex items-center gap-6">
                         <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl border border-indigo-500/20 group-hover:scale-110 transition-all">
                            {{ vista === 'bandeja' ? '⚡' : '📋' }}
                         </div>
                         <div>
                            <div class="flex items-center gap-2 mb-1">
                               <h3 class="text-lg font-bold text-white">{{ t.actividadNombre }}</h3>
                               <span class="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-wider">{{ t.estado }}</span>
                            </div>
                            <div class="flex items-center gap-4 text-xs text-slate-500">
                               <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> ID: {{ t.id.slice(0,8) }}</span>
                               <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Trámite: {{ t.tramiteId.slice(0,8) }}</span>
                               <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Asignado: {{ t.asignadoEn | date:'short' }}</span>
                            </div>
                         </div>
                      </div>
                      <div class="flex items-center gap-3">
                         @if (vista === 'disponible') {
                           <button (click)="tomarTarea(t)" class="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all">TOMAR TAREA</button>
                         } @else {
                           @if (t.estado === 'PENDIENTE') {
                             <button (click)="comenzarTarea(t)" class="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black transition-all uppercase">Comenzar</button>
                           } @else {
                             <button (click)="abrirFormulario(t)" class="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition-all uppercase">Completar</button>
                           }
                         }
                      </div>
                   </div>
                 }
              </div>
            }

            <!-- INICIAR TRAMITE -->
            @if (vista === 'iniciar') {
              <div class="grid grid-cols-2 gap-6">
                 @for (p of politicasActivas; track p.id) {
                   <div class="glass-card p-8 rounded-3xl hover:border-emerald-500/50 transition-all group">
                      <div class="flex justify-between items-start mb-6">
                         <div class="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-3xl border border-emerald-500/20">🚀</div>
                         <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Version {{ p.version }}</span>
                      </div>
                      <h3 class="text-xl font-bold text-white mb-2">{{ p.nombre }}</h3>
                      <p class="text-slate-500 text-sm mb-8 leading-relaxed">{{ p.descripcion || 'Flujo de trabajo empresarial estandarizado.' }}</p>
                      <button (click)="iniciarTramite(p)" class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:-translate-y-1 transition-all">Iniciar Nuevo Proceso</button>
                   </div>
                 }
              </div>
            }

            <!-- HISTORIAL -->
            @if (vista === 'historial') {
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Completadas</p>
                    <p class="text-3xl font-black text-white">{{ getRendimiento().total }}</p>
                    <div class="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="75"></div>
                    </div>
                 </div>
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Promedio Diario</p>
                    <p class="text-3xl font-black text-emerald-400">{{ getRendimiento().promedio }}</p>
                    <p class="text-[9px] text-slate-600 mt-2 font-bold uppercase">Meta: 12.0 tareas/día</p>
                 </div>
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Satisfacción (IA)</p>
                    <p class="text-3xl font-black text-sky-400">98%</p>
                    <div class="flex gap-1 mt-3">
                       <span *ngFor="let i of [1,2,3,4,5]" class="text-xs">⭐</span>
                    </div>
                 </div>
              </div>

              <div class="glass-card rounded-3xl overflow-hidden border border-white/5 bg-slate-900/30">
                 <table class="w-full text-left text-sm">
                    <thead>
                       <tr class="bg-slate-900/50 border-b border-slate-800">
                          <th class="px-8 py-5 font-black uppercase text-[10px] text-slate-500">Actividad</th>
                          <th class="px-6 py-5 font-black uppercase text-[10px] text-slate-500">Completado En</th>
                          <th class="px-6 py-5 font-black uppercase text-[10px] text-slate-500">Notas</th>
                          <th class="px-8 py-5 text-right font-black uppercase text-[10px] text-slate-500">Acciones</th>
                       </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800/40">
                       @for (h of workflowService.historial(); track h.id) {
                         <tr class="hover:bg-white/[0.02] transition-colors">
                            <td class="px-8 py-4 font-bold">{{ h.actividadNombre }}</td>
                            <td class="px-6 py-4 text-slate-400">{{ h.completadoEn | date:'medium' }}</td>
                            <td class="px-6 py-4 text-slate-500 italic text-xs truncate max-w-xs">{{ h.notas || 'Sin observaciones' }}</td>
                            <td class="px-8 py-4 text-right">
                               <span (click)="verDetalleHistorial(h)" class="text-indigo-400 font-bold text-xs hover:underline cursor-pointer relative z-50 p-2">Ver Detalle</span>
                            </td>
                         </tr>
                       }
                    </tbody>
                 </table>
              </div>
            }
          }
        </div>

        <!-- TOAST -->
        @if (toastMsg) {
          <div class="fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border shadow-2xl animate-fade flex items-center gap-3"
               [ngClass]="toastType === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'">
            <span class="text-lg">{{ toastType === 'success' ? '✅' : '❌' }}</span>
            <span class="text-xs font-bold">{{ toastMsg }}</span>
          </div>
        }

        <!-- MODAL FORMULARIO -->
        @if (tareaActiva) {
          <div class="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" (click)="cerrarModal()"></div>
             <div class="w-full max-w-3xl glass-card rounded-[40px] flex flex-col max-h-[90vh] overflow-hidden relative animate-fade">
                
                <!-- Modal Header -->
                <div class="p-8 border-b border-white/5 flex items-center justify-between">
                   <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl border border-emerald-500/20">📝</div>
                      <div>
                         <h2 class="text-xl font-black text-white">{{ tareaActiva.actividadNombre }}</h2>
                         <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Formulario de Registro de Actividad</p>
                      </div>
                   </div>
                   <button (click)="cerrarModal()" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400">&#10005;</button>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 overflow-y-auto p-10 space-y-8">
                   
                    <!-- Template Loader -->
                    <div class="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 mb-8">
                       <label class="block text-[10px] font-black uppercase text-indigo-400 mb-3 tracking-[0.2em]">Cargar Formulario Base</label>
                       <div class="flex gap-3">
                          <select #tplSelect class="form-input flex-1 appearance-none">
                             <option value="">Seleccionar Plantilla...</option>
                             @for (tpl of fs.templates(); track tpl.id) {
                               <option [value]="tpl.id">{{ tpl.nombre }}</option>
                             }
                          </select>
                          <button (click)="cargarPlantilla(tplSelect.value)" class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-500/20">CARGAR</button>
                       </div>
                    </div>

                    <!-- Dynamic Fields -->
                   <div class="grid grid-cols-2 gap-6">
                      @for (f of getFields(); track f.key) {
                        <div [class.col-span-2]="f.type === 'textarea'">
                           <div class="flex items-center justify-between mb-2">
                             <label class="block text-[10px] font-black uppercase text-slate-500 tracking-widest">
                               {{ f.label }} @if (f.required) { <span class="text-red-500">*</span> }
                             </label>
                             @if (f.extra) {
                               <button (click)="removeExtraField($index)" class="text-[9px] text-red-400 hover:text-red-300 font-bold transition-colors">ELIMINAR CAMPO</button>
                             }
                           </div>
                           
                           @if (f.type === 'text' || f.type === 'email') {
                             <input [type]="f.type" [(ngModel)]="formData[f.key]" class="form-input" [placeholder]="f.label" [class.border-red-500]="getFieldError(f)">
                           } @else if (f.type === 'number') {
                             <input type="number" [(ngModel)]="formData[f.key]" class="form-input" placeholder="0" [class.border-red-500]="getFieldError(f)">
                             
                             <!-- Restriction Hint -->
                             @if (f.validations?.min !== undefined || f.validations?.max !== undefined) {
                               <p class="text-[9px] text-slate-500 mt-1.5 font-medium italic flex items-center gap-1">
                                 <span class="text-indigo-400">ℹ️</span>
                                 Rango: 
                                 {{ f.validations?.min !== undefined ? 'mín ' + f.validations.min : '' }} 
                                 {{ f.validations?.min !== undefined && f.validations?.max !== undefined ? '-' : '' }} 
                                 {{ f.validations?.max !== undefined ? 'máx ' + f.validations.max : '' }}
                               </p>
                             }
                           } @else if (f.type === 'date') {
                             <input type="date" [(ngModel)]="formData[f.key]" class="form-input" [class.border-red-500]="getFieldError(f)">
                           } @else if (f.type === 'textarea') {
                             <textarea [(ngModel)]="formData[f.key]" rows="4" class="form-input resize-none" [placeholder]="'Escribe aqui...'" [class.border-red-500]="getFieldError(f)"></textarea>
                           } @else if (f.type === 'select') {
                             <select [(ngModel)]="formData[f.key]" class="form-input appearance-none" [class.border-red-500]="getFieldError(f)">
                                 @for (opt of f.options; track opt) {
                                   <option [value]="opt">{{ opt }}</option>
                                 }
                             </select>
                            } @else if (f.type === 'file') {
                              <div class="relative group/file">
                                <input type="file" (change)="onDynamicFileSelected($event, f.key)" class="hidden" [id]="f.key" [disabled]="uploadingFiles[f.key]">
                                <label [for]="f.key" [class]="formData[f.key] ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/40'" 
                                       class="flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-dashed transition-all hover:border-indigo-500/50"
                                       [class.cursor-pointer]="!uploadingFiles[f.key]"
                                       [class.opacity-50]="uploadingFiles[f.key]">
                                  
                                  @if (uploadingFiles[f.key]) {
                                    <span class="text-xl animate-spin">⏳</span>
                                  } @else {
                                    <span class="text-xl">{{ formData[f.key] ? '✅' : '📁' }}</span>
                                  }
                                  
                                  <div class="min-w-0 flex-1">
                                    <p class="text-[11px] font-bold" [class]="formData[f.key] ? 'text-emerald-400' : 'text-slate-400'">
                                      @if (uploadingFiles[f.key]) {
                                        Subiendo archivo...
                                      } @else {
                                        {{ formData[f.key] ? 'Archivo seleccionado' : 'Seleccionar Archivo...' }}
                                      }
                                    </p>
                                    @if (formData[f.key] && !uploadingFiles[f.key]) {
                                      <p class="text-[9px] text-emerald-600 uppercase font-bold">Subido correctamente</p>
                                    }
                                  </div>
                                </label>
                              </div>
                            }
                             
                             <!-- Validation Message -->
                             <div class="h-4 mt-1">
                               @if (getFieldError(f)) {
                                 <p class="text-[9px] text-red-500 font-bold flex items-center gap-1 animate-in slide-in-from-top-1">
                                   <span>⚠️</span> {{ getFieldError(f) }}
                                 </p>
                               }
                             </div>
                        </div>
                      }

                      <!-- Add Extra Field Form -->
                      @if (mostrandoAddExtra) {
                        <div class="col-span-2 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 animate-in zoom-in duration-200">
                          <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label class="block text-[9px] font-bold text-slate-500 uppercase mb-2">Nombre del Campo</label>
                              <input [(ngModel)]="nuevoCampo.label" placeholder="Ej. Numero de Factura" class="form-input">
                            </div>
                            <div>
                              <label class="block text-[9px] font-bold text-slate-500 uppercase mb-2">Tipo de Dato</label>
                              <select [(ngModel)]="nuevoCampo.type" class="form-input">
                                <option value="text">Texto</option>
                                <option value="number">Número</option>
                                <option value="date">Fecha</option>
                                <option value="textarea">Área de Texto</option>
                                <option value="file">Archivo Adjunto</option>
                              </select>
                            </div>
                          </div>
                          
                          <!-- Validation settings for extra field -->
                          @if (nuevoCampo.type === 'number') {
                            <div class="grid grid-cols-2 gap-4 mb-4 animate-in slide-in-from-top-2">
                              <div>
                                <label class="block text-[9px] font-bold text-slate-500 uppercase mb-2">Mínimo</label>
                                <input type="number" [(ngModel)]="nuevoCampo.min" placeholder="Ej. 18" class="form-input">
                              </div>
                              <div>
                                <label class="block text-[9px] font-bold text-slate-500 uppercase mb-2">Máximo</label>
                                <input type="number" [(ngModel)]="nuevoCampo.max" placeholder="Ej. 100" class="form-input">
                              </div>
                            </div>
                          }

                          <div class="flex gap-2">
                            <button (click)="mostrandoAddExtra = false" class="flex-1 py-2 rounded-xl bg-slate-800 text-[10px] font-bold text-slate-400">CANCELAR</button>
                            <button (click)="confirmAddExtraField()" class="flex-[2] py-2 rounded-xl bg-indigo-600 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/20">AÑADIR CAMPO</button>
                          </div>
                        </div>
                      } @else {
                        <div class="col-span-2">
                          <button (click)="mostrandoAddExtra = true" class="w-full py-4 rounded-2xl border-2 border-dashed border-slate-800 text-xs text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all group">
                            <span class="inline-block group-hover:scale-110 transition-transform mr-2">➕</span>
                            Añadir Campo Extraordinario
                          </button>
                        </div>
                      }
                   </div>

                   <!-- File Upload -->
                   <div>
                      <label class="block text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Archivos Adjuntos</label>
                      <div class="grid grid-cols-2 gap-4">
                         @for (file of archivosCargados; track $index) {
                           <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                              <div class="flex items-center gap-3">
                                 <span class="text-xl">📄</span>
                                 <div class="min-w-0">
                                    <p class="text-[11px] font-bold text-slate-200 truncate">{{ file.nombre }}</p>
                                    <p class="text-[9px] text-slate-500">{{ (file.size / 1024 / 1024) | number:'1.1-2' }} MB</p>
                                 </div>
                              </div>
                              <button (click)="eliminarArchivo($index)" class="text-red-500/50 hover:text-red-500 text-xs">🗑️</button>
                           </div>
                         }
                         
                         <label class="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-2"
                                [class.cursor-not-allowed]="isUploadingGeneral" [class.cursor-pointer]="!isUploadingGeneral">
                            <input type="file" (change)="onFileSelected($event)" class="hidden" [disabled]="isUploadingGeneral">
                            @if (isUploadingGeneral) {
                              <span class="text-2xl animate-spin">⏳</span>
                              <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Subiendo...</span>
                            } @else {
                              <span class="text-2xl">📤</span>
                              <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Subir Archivo</span>
                            }
                         </label>
                      </div>
                   </div>

                   <!-- General Notes -->
                   <div>
                      <label class="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Observaciones Finales</label>
                      <textarea [(ngModel)]="formularioNotas" rows="3" class="form-input resize-none" placeholder="Cualquier nota adicional..."></textarea>
                   </div>
                </div>

                <!-- Modal Footer -->
                <div class="p-8 border-t border-white/5 bg-slate-900/50 flex gap-4">
                   <button (click)="cerrarModal()" class="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all">Cancelar</button>
                   <button (click)="completarTarea()" class="flex-1 py-4 rounded-2xl btn-premium text-white font-black text-xs uppercase tracking-widest">Finalizar Actividad</button>
                </div>

             </div>
          </div>
        }

         <!-- MODAL: DETALLE HISTORIAL -->
         @if (detalleHistorial) {
           <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 overflow-y-auto">
             <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col animate-in zoom-in duration-300">
               <div class="p-10 border-b border-white/5 flex items-center justify-between">
                 <div>
                   <h2 class="text-2xl font-black text-white tracking-tight">{{ detalleHistorial.actividadNombre }}</h2>
                   <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Detalle de actividad completada</p>
                 </div>
                 <button (click)="detalleHistorial = null" class="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-white/5 transition-all">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                 </button>
               </div>

               <div class="p-10 space-y-8">
                 <div class="grid grid-cols-2 gap-4">
                   <div class="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                     <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Completado En</p>
                     <p class="text-sm text-slate-200 font-bold">{{ detalleHistorial.completadoEn | date:'medium' }}</p>
                   </div>
                   <div class="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                     <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">ID Registro</p>
                     <p class="text-[10px] text-slate-400 font-mono">{{ detalleHistorial.id }}</p>
                   </div>
                 </div>

                 <!-- Datos Formulario -->
                 @if (detalleHistorial.datosFormulario && (detalleHistorial.datosFormulario | keyvalue).length > 0) {
                   <div>
                     <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Datos del Formulario</p>
                     <div class="space-y-3">
                       @for (item of detalleHistorial.datosFormulario | keyvalue; track item.key) {
                         <div class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-1">
                           <span class="text-[9px] font-bold text-slate-500 uppercase">{{ getFieldLabel(item.key, detalleHistorial) }}</span>
                           @if (item.value && item.value.id && item.value.path) {
                             <a [href]="item.value.path" target="_blank" class="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-2">
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                               {{ item.value.nombre }}
                             </a>
                           } @else {
                             <span class="text-xs text-slate-200 font-medium">{{ item.value }}</span>
                           }
                         </div>
                       }
                     </div>
                   </div>
                 }

                 <!-- Documentación Adjunta -->
                 @if (detalleHistorial.archivos && detalleHistorial.archivos.length > 0) {
                   <div>
                     <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Documentación Adjunta</p>
                     <div class="grid grid-cols-2 gap-3">
                       @for (file of detalleHistorial.archivos; track file.id) {
                         <a [href]="file.path || file.url || '/api/archivos/download/' + file.id" target="_blank"
                            class="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3 hover:bg-white/[0.05] transition-all">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </div>
                            <div class="min-w-0">
                              <p class="text-xs font-bold text-slate-200 truncate">{{ file.nombre }}</p>
                              <p class="text-[9px] text-slate-500 uppercase">{{ (file.tamano || 0) / 1024 | number:'1.0-0' }} KB</p>
                            </div>
                         </a>
                       }
                     </div>
                   </div>
                 }

                 <!-- Notas -->
                 <div>
                   <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Notas / Observaciones</p>
                   <div class="p-5 rounded-3xl bg-slate-950/50 border border-white/5 text-sm text-slate-400 italic">
                     {{ detalleHistorial.notas || 'Sin observaciones registradas.' }}
                   </div>
                 </div>
               </div>

               <div class="p-10 border-t border-white/5 flex justify-end">
                 <button (click)="detalleHistorial = null" class="px-8 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Cerrar</button>
               </div>
             </div>
           </div>
         }

      </main>

      <style>
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 16px;
          border-radius: 14px;
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .nav-item:hover {
          color: #f1f5f9;
          background: rgba(255,255,255,0.03);
        }
        .nav-item.active {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.2);
        }
        .nav-item .icon { font-size: 14px; }
      </style>

    </div>
  `,
})
export class FuncionarioComponent implements OnInit {
  vista: 'bandeja' | 'disponible' | 'historial' | 'iniciar' = 'bandeja';
  
  // Data
  politicasActivas: PoliticaDTO[] = [];
  
  // Modal Form
  tareaActiva: RegistroActividadDTO | null = null;
  detalleHistorial: RegistroActividadDTO | null = null;
  formData: Record<string, any> = {};
  uploadingFiles: Record<string, boolean> = {};
  isUploadingGeneral = false;
  archivosCargados: any[] = [];
  formularioNotas = '';
  mostrandoAddExtra = false;

  // UI Icons
  private sanitizer = inject(DomSanitizer);
  
  menu: { view: 'bandeja' | 'disponible' | 'historial' | 'iniciar', label: string, svg: string, safeSvg?: SafeHtml }[] = [
    { view: 'bandeja', label: 'Mis Tareas', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>` },
    { view: 'disponible', label: 'Disponibles', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4"/><path d="M13 7 8.5 2.5a2.12 2.12 0 0 0-3 0L2.5 5.5a2.12 2.12 0 0 0 0 3L7 13"/><path d="m9 15 4 4"/><path d="M11 17l4.5 4.5a2.12 2.12 0 0 0 3 0l3-3a2.12 2.12 0 0 0 0-3L17 11"/><path d="m12 12 4-4"/><path d="m8 16 4-4"/></svg>` },
    { view: 'historial', label: 'Historial', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>` },
    { view: 'iniciar', label: 'Iniciar Trámite', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 2.6-2 3.5 0 1 2 1 2 1s1-1 1-2c0-.9-.74-2.24-1-3.5Z"/><path d="M15 8.5c1.5-1.26 2-2.6 2-3.5 0-1-2-1-2-1s-1 1-1 2c0 .9.74 2.24 1 3.5Z"/><path d="M12 12c2.14 0 4.22 1.2 5.8 3.03 1.51 1.74 2.27 3.58 2.2 4.97-.03.53-.28 1-.7 1.3a1.55 1.55 0 0 1-1.3.3c-1.39-.27-3.23-1.42-4.97-3.41A13.9 13.9 0 0 1 12 12Z"/><path d="M12 12c-2.14 0-4.22-1.2-5.8-3.03-1.51-1.74-2.27-3.58-2.2-4.97.03-.53.28-1 .7-1.3a1.55 1.55 0 0 1 1.3-.3c1.39.27 3.23 1.42 4.97 3.41A13.9 13.9 0 0 1 12 12Z"/><path d="M9 15c-1.8 1.8-3.9 3.1-6 3.1-.3 0-.6 0-.8-.1-.4-.1-.7-.3-.9-.6-.2-.3-.3-.7-.2-1.1.2-2.1 1.5-4.2 3.3-6 1.8-1.8 3.9-3.1 6-3.1.3 0 .6 0 .8.1.4.1.7.3.9.6.2.3.3.7.2 1.1-.2 2.1-1.5 4.2-3.3 6Z"/></svg>` }
  ];

  getSafeIcon(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  nuevoCampo: any = { label: '', type: 'text', min: null, max: null };

  // UI
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  cargando = signal<boolean>(false);

  get deptoNombre() {
    return (this.auth.usuario() as any)?.departamento || 'Funcionario';
  }

  getFieldError(f: any): string | null {
    const val = this.formData[f.key];
    if (f.required && (val === undefined || val === null || val === '')) return 'Este campo es obligatorio';
    
    if (f.type === 'number' && val !== undefined && val !== null && val !== '') {
      const numVal = Number(val);
      const v = f.validations || {};
      if (v.min !== undefined && v.min !== null && String(v.min) !== '') {
        if (numVal < Number(v.min)) return `El valor mínimo es ${v.min}`;
      }
      if (v.max !== undefined && v.max !== null && String(v.max) !== '') {
        if (numVal > Number(v.max)) return `El valor máximo es ${v.max}`;
      }
    }
    
    if (f.validations?.pattern && val) {
      const regex = new RegExp(f.validations.pattern);
      if (!regex.test(val)) return f.validations.customMsg || 'Formato inválido';
    }
    
    return null;
  }

  // Performance Stats
  getRendimiento() {
    const hist = this.workflowService.historial();
    const hoy = new Date().setHours(0,0,0,0);
    const completadasHoy = hist.filter(h => new Date(h.completadoEn!).getTime() > hoy).length;
    const total = hist.length;
    return {
      completadasHoy,
      total,
      promedio: total > 0 ? (total / 30).toFixed(1) : 0 // hypothetical monthly avg
    };
  }

  constructor(
    public workflowService: WorkflowService,
    public auth: AuthService,
    private politicaService: PoliticaService,
    private archivoService: ArchivoService,
    public fs: FormularioService
  ) {
    effect(() => {
      const user = this.auth.usuario();
      const v = this.vista;
      if (user) {
        this.cargarDatos();
      }
    });
  }

  ngOnInit(): void {
    this.menu.forEach(m => m.safeSvg = this.getSafeIcon(m.svg));
    this.cargarDatos();
    // Prefetch para agilidad
    const user = this.auth.usuario();
    if (user) {
      this.politicaService.listarIniciables(user.tenantId, user.departamentoId || '', user.rol).subscribe(p => this.politicasActivas = p);
    }
  }

  setVista(v: any) {
    this.vista = v;
    this.cargarDatos();
  }

  cargarDatos() {
    const user = this.auth.usuario();
    if (!user) return;
    this.cargando.set(true);

    const finalize = () => this.cargando.set(false);

    if (this.vista === 'bandeja') {
      this.workflowService.cargarBandejaUnificada(user.id, user.departamentoId).subscribe({ next: finalize, error: finalize });
    } else if (this.vista === 'disponible') {
      const obs = user.departamentoId 
        ? this.workflowService.cargarTareasNoAsignadasDepartamento(user.departamentoId)
        : this.workflowService.cargarTareasNoAsignadas();
      obs.subscribe({ next: finalize, error: finalize });
    } else if (this.vista === 'iniciar') {
      this.politicaService.listarIniciables(user.tenantId, user.departamentoId || '', user.rol || 'USER').subscribe({
        next: p => { this.politicasActivas = p; finalize(); },
        error: (e) => { console.error('Error cargando políticas:', e); finalize(); }
      });
    } else if (this.vista === 'historial') {
      this.workflowService.cargarHistorial(user.id).subscribe({ next: finalize, error: finalize });
    }
    
    // Cargar plantillas de formularios
    this.fs.listarPorTenant(user.tenantId).subscribe();
  }

  getTitulo() {
    return { bandeja: 'Tareas Pendientes', disponible: 'Mercado de Tareas', historial: 'Control de Rendimiento', iniciar: 'Nuevo Trámite' }[this.vista];
  }

  getSubtitulo() {
    return { 
      bandeja: 'Gestiona las actividades asignadas a tu departamento.', 
      disponible: 'Toma tareas libres y acelera el flujo de trabajo.', 
      historial: 'Analiza tu progreso y el historial de acciones.',
      iniciar: 'Pon en marcha una nueva política de negocio.'
    }[this.vista];
  }

  getTareas() {
    if (this.vista === 'bandeja') return this.workflowService.tareasPendientes();
    if (this.vista === 'disponible') return this.workflowService.tareasNoAsignadas();
    if (this.vista === 'historial') return this.workflowService.historial();
    return [];
  }

  // ACCIONES
  tomarTarea(t: RegistroActividadDTO) {
    this.workflowService.tomarTarea(t.id, this.auth.usuario()!.id).subscribe({
      next: () => { this.showToast('Tarea tomada con éxito', 'success'); this.cargarDatos(); },
      error: (e) => this.showToast(e.error?.message || 'Error al tomar tarea', 'error')
    });
  }

  comenzarTarea(t: RegistroActividadDTO) {
    // Si esta PENDIENTE pero ya es del usuario, pasar a EN_PROGRESO
    this.tomarTarea(t);
  }

  abrirFormulario(t: RegistroActividadDTO) {
    this.tareaActiva = t;
    this.formData = { ...(t.datosFormulario || {}) };
    this.archivosCargados = [...(t.archivos || [])];
    this.formularioNotas = t.notas || '';
  }

  getFields() {
    if (!this.tareaActiva?.esquemaFormulario) return [];
    return (this.tareaActiva.esquemaFormulario as any).fields || [];
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingGeneral = true;
      this.showToast('Subiendo archivo...', 'success');
      this.archivoService.subir(file).subscribe({
        next: (res) => {
          this.archivosCargados.push({
            id: res.id,
            nombre: file.name,
            tamano: file.size,
            path: res.url || this.archivoService.getDownloadUrl(res.id),
            tipo: file.type,
            subidoEn: new Date().toISOString()
          });
          this.isUploadingGeneral = false;
          this.showToast('Archivo subido con éxito', 'success');
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.isUploadingGeneral = false;
          this.showToast('Error al subir archivo', 'error');
        }
      });
    }
  }

  eliminarArchivo(idx: number) { this.archivosCargados.splice(idx, 1); }
  
  // EXTRAORDINARY: Permite al funcionario añadir campos al vuelo
  confirmAddExtraField() {
    if (!this.nuevoCampo.label) return;
    const fields = this.getFields();
    const key = 'extra_' + Date.now();
    fields.push({ 
      key, 
      label: this.nuevoCampo.label, 
      type: this.nuevoCampo.type, 
      required: false, 
      extra: true,
      validations: this.nuevoCampo.type === 'number' ? { 
        min: this.nuevoCampo.min != null ? Number(this.nuevoCampo.min) : undefined, 
        max: this.nuevoCampo.max != null ? Number(this.nuevoCampo.max) : undefined 
      } : undefined
    });
    
    if (!this.tareaActiva?.esquemaFormulario) {
       (this.tareaActiva as any).esquemaFormulario = { fields: [] };
    }
    (this.tareaActiva!.esquemaFormulario as any).fields = [...fields];
    this.nuevoCampo = { label: '', type: 'text' };
    this.mostrandoAddExtra = false;
  }

  removeExtraField(idx: number) {
    const fields = this.getFields();
    fields.splice(idx, 1);
    (this.tareaActiva!.esquemaFormulario as any).fields = [...fields];
  }

  cargarPlantilla(templateId: string) {
    if (!templateId || !this.tareaActiva) return;
    const tpl = this.fs.templates().find((t: FormularioTemplate) => t.id === templateId);
    if (tpl) {
      if (!this.tareaActiva.esquemaFormulario) {
        (this.tareaActiva as any).esquemaFormulario = { fields: [] };
      }
      const existingFields = this.getFields();
      // Mezclar campos nuevos con los existentes (o reemplazar si el usuario prefiere)
      // Por ahora vamos a REEMPLAZAR para que sea más limpio
      (this.tareaActiva.esquemaFormulario as any).fields = JSON.parse(JSON.stringify(tpl.campos));
      this.showToast('Plantilla "' + tpl.nombre + '" cargada', 'success');
    }
  }

  onDynamicFileSelected(event: any, key: string) {
    const file = event.target.files[0];
    if (file) {
      this.uploadingFiles = { ...this.uploadingFiles, [key]: true };
      this.showToast(`Subiendo ${file.name}...`, 'success');
      this.archivoService.subir(file).subscribe({
        next: (res) => {
          this.formData[key] = {
            id: res.id,
            nombre: file.name,
            tamano: file.size,
            path: res.url || this.archivoService.getDownloadUrl(res.id),
            tipo: file.type,
            subidoEn: new Date().toISOString()
          };
          this.uploadingFiles = { ...this.uploadingFiles, [key]: false };
          this.showToast('Archivo subido correctamente', 'success');
        },
        error: (err) => {
          console.error('Dynamic upload error:', err);
          this.uploadingFiles = { ...this.uploadingFiles, [key]: false };
          this.showToast('Error al subir el archivo', 'error');
        }
      });
    }
  }

  completarTarea() {
    if (!this.tareaActiva) return;
    
    // VALIDACIÓN DE CAMPOS
    const fields = this.getFields();
    for (const f of fields) {
      const val = this.formData[f.key];
      
      // 1. Requerido
      if (f.required && !val) {
        this.showToast(`El campo "${f.label}" es obligatorio`, 'error');
        return;
      }

      // 2. Numéricos (Min/Max)
      if (f.type === 'number' && val !== undefined && val !== null && val !== '') {
        const numVal = Number(val);
        const v = f.validations || {};
        if (v.min !== undefined && v.min !== null && v.min !== '') {
          const minVal = Number(v.min);
          if (numVal < minVal) {
            this.showToast(`"${f.label}" debe ser al menos ${minVal}`, 'error');
            return;
          }
        }
        if (v.max !== undefined && v.max !== null && v.max !== '') {
          const maxVal = Number(v.max);
          if (numVal > maxVal) {
            this.showToast(`"${f.label}" no puede superar ${maxVal}`, 'error');
            return;
          }
        }
      }

      // 3. Patrón (Regex)
      if (f.validations?.pattern && val) {
        const regex = new RegExp(f.validations.pattern);
        if (!regex.test(val)) {
          this.showToast(f.validations.customMsg || `Formato inválido en "${f.label}"`, 'error');
          return;
        }
      }
    }

    const req: CompletarTareaRequest = {
      registroId: this.tareaActiva.id,
      esquemaFormulario: this.tareaActiva.esquemaFormulario,
      datosFormulario: this.formData,
      archivos: this.archivosCargados,
      notas: this.formularioNotas
    };
    // Note: files should be part of the request if we update the DTO, 
    // but for now they are stored in the object if the backend supports it.
    // I'll add them to the request if I update the DTO again.
    
    this.workflowService.completarTarea(req, this.auth.usuario()!.id).subscribe({
      next: () => {
        this.cerrarModal();
        this.showToast('Actividad completada y derivada', 'success');
        this.cargarDatos();
      },
      error: (e) => this.showToast(e.error?.message || 'Error al completar', 'error')
    });
  }

  verDetalleHistorial(h: RegistroActividadDTO) {
    this.detalleHistorial = h;
  }

  getFieldLabel(key: any, registro: RegistroActividadDTO | null): string {
    const sKey = String(key);
    if (!registro?.esquemaFormulario) return sKey;
    const fields = (registro.esquemaFormulario as any).fields || [];
    const field = fields.find((f: any) => f.key === sKey);
    return field ? field.label : sKey;
  }

  cerrarModal() { this.tareaActiva = null; }

  iniciarTramite(p: PoliticaDTO) {
    const user = this.auth.usuario();
    this.workflowService.iniciarTramite({ 
      politicaId: p.id,
      usuarioId: user?.id 
    }).subscribe({
      next: () => {
        this.showToast('Nuevo trámite iniciado con éxito', 'success');
        this.setVista('bandeja');
      },
      error: (e) => this.showToast(e.error?.message || 'Error al iniciar trámite', 'error')
    });
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg; this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

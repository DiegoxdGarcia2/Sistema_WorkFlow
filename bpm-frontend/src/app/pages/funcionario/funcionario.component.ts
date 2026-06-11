import { Component, OnInit, OnDestroy, inject, signal, effect, untracked, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { PoliticaService } from '../../services/politica.service';
import { ArchivoService } from '../../services/archivo.service';
import { environment } from '../../../environments/environment';
import {
  RegistroActividadDTO,
  CompletarTareaRequest,
  PoliticaDTO,
  TramiteDTO,
} from '../../models/bpm.models';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClienteService } from '../../services/cliente.service';
import { ClienteDTO } from '../../models/bpm.models';
import { FormularioService, FormularioTemplate } from '../../services/formulario.service';
import { KeyValuePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { OfflineUploadQueueService } from '../../services/offline-upload-queue.service';
import { VoiceFillerModalComponent } from '../../components/voice-filler-modal/voice-filler-modal.component';
import { TensorflowService } from '../../services/tensorflow.service';
import { TensorflowPredictionsCard } from '../../components/tensorflow-predictions-card/tensorflow-predictions-card';

import { RepositorioComponent } from './repositorio.component';
import { EditorColaborativoComponent } from '../../components/editor-colaborativo/editor-colaborativo.component';
import { ColaboracionService, ColaboradorDTO } from '../../services/colaboracion.service';

@Component({
  selector: 'app-funcionario',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceFillerModalComponent, RepositorioComponent, TensorflowPredictionsCard, EditorColaborativoComponent],
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
      @if (vista !== 'repositorio') {
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
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Hoy</p>
                   <p class="text-xl font-black text-white leading-none">{{ getRendimiento().completadasHoy }}</p>
                </div>
                <div class="w-px h-10 bg-slate-800"></div>
                <div class="text-center">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Por Hacer</p>
                   <p class="text-xl font-black text-amber-400 leading-none">{{ getRendimiento().porHacer }}</p>
                </div>
                <div class="w-px h-10 bg-slate-800"></div>
                <div class="text-center">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Disponibles</p>
                   <p class="text-xl font-black text-emerald-400 leading-none">{{ getRendimiento().disponibles }}</p>
                </div>
                <div class="w-px h-10 bg-slate-800"></div>
                <div class="text-center">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Eficiencia</p>
                   <p class="text-xl font-black text-indigo-400 leading-none">{{ getRendimiento().eficiencia }}</p>
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
                            <div class="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> ID: {{ t.id.slice(0,8) }}</span>
                                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Trámite: {{ t.tramiteId.slice(0,8) }}</span>
                                @if (t.clienteNombre) {
                                  <span class="flex items-center gap-1.5 text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/25"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Cliente: {{ t.clienteNombre }}</span>
                                }
                                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Asignado: {{ t.asignadoEn | date:'short' }}</span>
                             </div>
                         </div>
                      </div>
                      <div class="flex items-center gap-3">
                         @if (vista === 'disponible') {
                           <button (click)="tomarTarea(t)" [disabled]="procesandoId() === t.id" class="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                             @if (procesandoId() === t.id) { <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> }
                             TOMAR TAREA
                           </button>
                         } @else {
                           @if (t.estado === 'PENDIENTE') {
                             <button (click)="comenzarTarea(t)" [disabled]="procesandoId() === t.id" class="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                               @if (procesandoId() === t.id) { <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> }
                               Comenzar
                             </button>
                           } @else {
                             <button (click)="abrirFormulario(t)" class="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition-all uppercase">Completar</button>
                           }
                         }
                      </div>
                   </div>
                 }
              </div>
            }

            <!-- CO-EDICIÓN EN VIVO -->
             @if (vista === 'colaborativo') {
               <div class="grid grid-cols-1 gap-6">
                 @if (tareasDepartamento().length === 0) {
                   <div class="py-20 text-center glass-card rounded-3xl">
                      <div class="text-5xl mb-4 opacity-20">👥</div>
                      <p class="text-slate-400 font-medium">No hay trámites activos en tu departamento</p>
                      <p class="text-slate-600 text-xs mt-1">Los documentos aparecerán aquí cuando se inicien trámites.</p>
                   </div>
                 }
                 @for (t of tareasCoEdicionDeduplicadas(); track t.tramiteId || t.id) {
                   <div class="glass-card p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-indigo-500/50 transition-all duration-300">
                      <div class="flex items-center gap-6 min-w-0 flex-1">
                         <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl border border-indigo-500/20 group-hover:scale-110 transition-all flex-shrink-0">
                            📄
                         </div>
                         <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-3 mb-1.5 flex-wrap">
                               <h3 class="text-lg font-black text-white truncate">{{ t.clienteNombre || 'Trámite sin Solicitante' }}</h3>
                               <span class="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-wider border border-indigo-500/25">
                                 {{ t.actividadNombre }}
                               </span>
                               @if (editoresPorTramite()[t.tramiteId] && editoresPorTramite()[t.tramiteId].length > 0) {
                                 <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/25 flex items-center gap-1.5 animate-pulse">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    {{ editoresPorTramite()[t.tramiteId].length }} En Vivo
                                 </span>
                               }
                            </div>
                            <div class="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Trámite: <span class="font-mono text-[11px]">{{ t.tramiteId.slice(0,8) }}</span></span>
                                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Tarea: <span class="font-mono text-[11px]">{{ t.id.slice(0,8) }}</span></span>
                                <span class="flex items-center gap-1.5 font-medium">
                                  <span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                  Responsable: 
                                  @if (t.ejecutadoPor) {
                                    <span class="text-indigo-300 font-semibold">{{ t.ejecutadoPor }}</span>
                                  } @else {
                                    <span class="text-amber-500 font-semibold uppercase tracking-widest text-[9px] bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Disponible</span>
                                  }
                                </span>
                             </div>
                         </div>
                      </div>
                      
                      <div class="flex items-center gap-4 flex-shrink-0">
                         <!-- Avatares de editores en vivo -->
                         @if (editoresPorTramite()[t.tramiteId] && editoresPorTramite()[t.tramiteId].length > 0) {
                           <div class="flex -space-x-2.5 overflow-hidden">
                             @for (editor of editoresPorTramite()[t.tramiteId]; track editor.id) {
                               <div [style.background-color]="editor.color" 
                                    [title]="editor.nombre"
                                    class="inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-black text-white border-2 border-slate-950 shadow-md">
                                 {{ editor.avatar }}
                               </div>
                             }
                           </div>
                         }
                      
                         @if (t.estado === 'PENDIENTE') {
                           <button (click)="tomarYUnirse(t)" class="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/10">
                             Tomar e Iniciar Co-Edición
                           </button>
                         } @else {
                           <button (click)="unirseAlBorrador(t)" class="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                              <span>👥</span> Unirse al Borrador
                           </button>
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
                      <button (click)="abrirSeleccionCliente(p)" [disabled]="procesandoId() === p.id" class="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        @if (procesandoId() === p.id) { <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> <span>Procesando...</span> } @else { <span>Iniciar Nuevo Proceso</span> }
                      </button>
                   </div>
                 }
              </div>
            }

            <!-- HISTORIAL -->
            @if (vista === 'historial') {
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Completadas</p>
                    <p class="text-3xl font-black text-white">{{ workflowService.historial().length }}</p>
                    <div class="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                       <div class="h-full bg-indigo-500 rounded-full" [style.width.%]="75"></div>
                    </div>
                 </div>
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Completadas Hoy</p>
                    <p class="text-3xl font-black text-emerald-400">{{ getRendimiento().completadasHoy }}</p>
                    <p class="text-[9px] text-slate-600 mt-2 font-bold uppercase">En la jornada actual</p>
                 </div>
                 <div class="glass-card p-6 rounded-3xl border border-white/5 bg-slate-900/50">
                    <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Eficiencia</p>
                    <p class="text-3xl font-black text-sky-400">{{ getRendimiento().eficiencia }}</p>
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
        @if (tareaActiva && !esCoEdicionActivaDirecta) {
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
                   <div class="flex items-center gap-3">
                      <button (click)="abrirModalVoz()" class="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all" title="Llenar con Voz">
                        <span>🎙️</span> Llenar con Voz
                      </button>
                      <button (click)="cerrarModal()" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400">&#10005;</button>
                   </div>
                </div>

                <!-- Modal Body -->
                <div class="flex-1 overflow-y-auto p-10 space-y-8">

                    <!-- Predicción de Enrutamiento Inteligente TensorFlow -->
                    @if (prediccionActual()) {
                      <div class="p-6 rounded-3xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col md:flex-row gap-6 items-center justify-between">
                         <div class="flex-1">
                            <h4 class="text-xs font-black uppercase text-indigo-400 mb-1.5 tracking-widest flex items-center gap-2">
                              <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                              Enrutamiento Inteligente (TensorFlow)
                            </h4>
                            <p class="text-[11px] text-slate-400 leading-relaxed mb-1">
                              Predicción de tiempo de respuesta y sugerencia de canal óptimo basada en el historial de tramitación del cliente y carga de colas actuales.
                            </p>
                         </div>
                         <app-tensorflow-predictions-card 
                           [rutaSugerida]="prediccionActual()!.rutaSugerida"
                           [tiempoEstimadoMinutos]="prediccionActual()!.tiempoEstimadoMinutos"
                           [prioridadRecomendada]="prediccionActual()!.prioridadRecomendada"
                           [isAnomalo]="prediccionActual()!.isAnomalo"
                           [scoreEficiencia]="prediccionActual()!.scoreEficiencia"
                           class="w-full md:w-auto">
                         </app-tensorflow-predictions-card>
                      </div>
                    }

                    <!-- Alerta de Anomalía Crítica Detectada por TensorFlow -->
                    @if (prediccionActual()?.isAnomalo) {
                      <div class="p-6 rounded-3xl bg-red-500/10 border border-red-500/25 flex gap-4 items-start animate-pulse">
                         <div class="text-2xl mt-0.5">⚠️</div>
                         <div>
                            <h4 class="text-xs font-black uppercase text-red-400 tracking-wider">
                              Alerta de Anomalía Operativa Detectada por TensorFlow
                            </h4>
                            <p class="text-xs text-slate-300 leading-relaxed mt-1">
                              El motor de Inteligencia Artificial (Autoencoder) ha identificado que las condiciones actuales de asignación (carga de trabajo inusual, horario irregular o desviación histórica) están fuera de distribución. Se sugiere procesar el caso con precaución.
                            </p>
                         </div>
                      </div>
                    }
                   
                    <!-- Documento Borrador / Contract-Drafting -->
                    <div class="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 mb-8 flex items-center justify-between gap-4">
                       <div>
                          <h4 class="text-xs font-black uppercase text-indigo-400 mb-1.5 tracking-widest flex items-center gap-2">
                             <span>📄</span> Borrador Colaborativo del Documento
                          </h4>
                          <p class="text-[11px] text-slate-400 leading-relaxed">
                             Este trámite permite la redacción y firma colaborativa del borrador en tiempo real antes de su emisión final.
                          </p>
                       </div>
                       <button (click)="abrirEditorBorrador()" class="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap">
                          EDITAR BORRADOR
                       </button>
                    </div>

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

                    <!-- Documentos Requeridos de la Actividad -->
                    @if (tareaActiva.documentosRequeridos && tareaActiva.documentosRequeridos.length > 0) {
                      <div class="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 mb-8 space-y-4">
                         <label class="block text-[10px] font-black uppercase text-amber-500 tracking-widest">Documentos Obligatorios Requeridos</label>
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            @for (doc of tareaActiva.documentosRequeridos; track doc) {
                              <div class="p-4 rounded-2xl border flex items-center justify-between"
                                   [class.border-emerald-500/30]="tieneDocumentoRequerido(doc)"
                                   [class.bg-emerald-500/5]="tieneDocumentoRequerido(doc)"
                                   [class.border-amber-500/30]="!tieneDocumentoRequerido(doc)"
                                   [class.bg-amber-500/5]="!tieneDocumentoRequerido(doc)">
                                 <div class="min-w-0 flex-1 mr-2">
                                    <p class="text-xs font-bold text-white truncate">{{ doc }}</p>
                                    <p class="text-[9px] font-medium" [class.text-emerald-400]="tieneDocumentoRequerido(doc)" [class.text-amber-500]="!tieneDocumentoRequerido(doc)">
                                      {{ tieneDocumentoRequerido(doc) ? 'Cargado: ' + getDocumentoRequeridoNombre(doc) : 'Pendiente de subir' }}
                                    </p>
                                 </div>
                                 <div class="flex items-center gap-2">
                                    <input type="file" (change)="onRequiredFileSelected($event, doc)" class="hidden" [id]="'req-doc-' + $index" [disabled]="subiendoDocRequerido[doc]">
                                    <label [for]="'req-doc-' + $index" *ngIf="!tieneDocumentoRequerido(doc)"
                                           class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-all">
                                       <span>{{ subiendoDocRequerido[doc] ? '⏳' : '📤' }}</span>
                                       <span>Subir</span>
                                    </label>
                                    <button *ngIf="tieneDocumentoRequerido(doc)" (click)="eliminarDocumentoRequerido(doc)" class="text-red-500 hover:text-red-400 text-sm p-2">🗑️</button>
                                 </div>
                              </div>
                            }
                         </div>
                      </div>
                    }

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
                   <button (click)="cerrarModal()" class="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all" [disabled]="guardando()">Cancelar</button>
                   <button (click)="completarTarea()" [disabled]="guardando()" class="flex-1 py-4 rounded-2xl btn-premium text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                      @if (guardando()) {
                        <span class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        <span>PROCESANDO...</span>
                      } @else {
                        <span>Finalizar Actividad</span>
                      }
                   </button>
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
                           @if (item.value && item.value.id && (item.value.path || item.value.url)) {
                             <a [href]="getFileUrl(item.value)" target="_blank" class="text-xs text-indigo-400 font-bold hover:underline flex items-center gap-2">
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
                         <a [href]="getFileUrl(file)" target="_blank"
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

        <!-- MODAL: SELECCIÓN DE CLIENTE -->
        @if (modalClienteOpen) {
          <div class="fixed inset-0 z-[120] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-md" (click)="modalClienteOpen = false"></div>
            <div class="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col relative animate-fade overflow-hidden">
              
              <div class="p-10 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <h2 class="text-xl font-black text-white leading-tight">Asociar Cliente</h2>
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Vincular proceso a un solicitante</p>
                  </div>
                </div>
                <button (click)="modalClienteOpen = false" class="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-slate-400">&#10005;</button>
              </div>

              <div class="p-10 space-y-6">
                @if (!mostrandoRegistroCliente) {
                  <!-- Search bar -->
                  <div class="relative">
                    <input [(ngModel)]="busquedaCliente" (keyup.enter)="buscarClientes()" placeholder="Buscar por CI o Nombre..." 
                           class="w-full pl-12 pr-32 py-4 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 outline-none transition-all">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    <button (click)="buscarClientes()" class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-indigo-600 text-[10px] font-black text-white uppercase tracking-widest">Buscar</button>
                  </div>

                  <!-- Results -->
                  <div class="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                    @for (c of clientesEncontrados(); track c.id) {
                      <div (click)="seleccionarCliente(c)" 
                           class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group"
                           [class.bg-indigo-500/10]="clienteSeleccionado?.id === c.id"
                           [class.border-indigo-500/50]="clienteSeleccionado?.id === c.id"
                           [class.border-white/5]="clienteSeleccionado?.id !== c.id"
                           [class.hover:bg-white/5]="clienteSeleccionado?.id !== c.id">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                            {{ c.nombre.charAt(0) }}{{ c.apellido.charAt(0) }}
                          </div>
                          <div>
                            <p class="text-xs font-bold text-white">{{ c.nombre }} {{ c.apellido || '' }}</p>
                            <p class="text-[9px] text-slate-500 font-medium">CI: {{ c.ci }}</p>
                          </div>
                        </div>
                        @if (clienteSeleccionado?.id === c.id) {
                          <span class="text-indigo-400 text-xs">✓</span>
                        }
                      </div>
                    } @empty {
                      @if (busquedaCliente && clientesEncontrados().length === 0) {
                        <div class="py-10 text-center">
                          <p class="text-xs text-slate-500 font-bold mb-4">No se encontraron clientes con "{{ busquedaCliente }}"</p>
                          <button (click)="mostrandoRegistroCliente = true; formNuevoCliente.ci = busquedaCliente" 
                                  class="px-6 py-3 rounded-2xl border-2 border-dashed border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/5 transition-all">
                            + Registrar Nuevo Cliente
                          </button>
                        </div>
                      }
                    }
                  </div>

                  <!-- Prerrequisitos de Política si existen y hay cliente seleccionado -->
                  @if (clienteSeleccionado && politicaParaIniciar && politicaParaIniciar.requisitosIniciales && politicaParaIniciar.requisitosIniciales.length > 0) {
                     <div class="p-6 rounded-3xl bg-indigo-950/20 border border-indigo-500/20 mb-4 space-y-4">
                        <h4 class="text-xs font-black uppercase text-indigo-400 tracking-widest flex items-center gap-1.5">
                           <span>🔒</span> Documentos Prerrequisitos Obligatorios
                        </h4>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                           Se requiere adjuntar los siguientes documentos iniciales para abrir el caso de {{ politicaParaIniciar.nombre }}.
                        </p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                           @for (req of politicaParaIniciar.requisitosIniciales; track req) {
                               <div class="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    [class.border-emerald-500/30]="tienePrerequisito(req)"
                                    [class.bg-emerald-500/5]="tienePrerequisito(req)"
                                    [class.border-indigo-500/30]="!tienePrerequisito(req)"
                                    [class.bg-indigo-500/5]="!tienePrerequisito(req)">
                                  <div class="min-w-0 flex-1">
                                     <div class="flex items-center gap-2 mb-1">
                                        <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-800 text-slate-300">
                                           {{ getReqType(req) }}
                                        </span>
                                        <p class="text-xs font-bold text-white truncate">{{ getCleanReqName(req) }}</p>
                                     </div>
                                     <p class="text-[9px] font-medium" [class.text-emerald-400]="tienePrerequisito(req)" [class.text-indigo-400]="!tienePrerequisito(req)">
                                        {{ tienePrerequisito(req) ? 'Cargado: ' + getPrerequisitoNombre(req) : 'Falta completar' }}
                                     </p>
                                  </div>
                                  <div class="flex items-center gap-2">
                                     @if (getReqType(req) === 'archivo') {
                                        <input type="file" (change)="onPrereqFileSelected($event, req)" class="hidden" [id]="'prereq-file-' + $index" [disabled]="subiendoPrerequisito[req]">
                                        <label [for]="'prereq-file-' + $index" *ngIf="!tienePrerequisito(req)"
                                               class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-all">
                                           <span>{{ subiendoPrerequisito[req] ? '⏳' : '📤' }}</span>
                                           <span>Subir</span>
                                        </label>
                                        <button *ngIf="tienePrerequisito(req)" (click)="eliminarPrerequisito(req)" class="text-red-500 hover:text-red-400 text-sm p-2">🗑️</button>
                                     } @else {
                                        <input [type]="getReqType(req) === 'número' ? 'number' : (getReqType(req) === 'fecha' ? 'date' : 'text')"
                                               [value]="prereqInputs[req] || ''"
                                               (input)="onPrereqInputChanged(req, $event)"
                                               placeholder="Completar campo..."
                                               class="w-full md:w-48 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-indigo-500 transition-all">
                                     }
                                  </div>
                               </div>
                            }
                        </div>
                     </div>
                  }

                  <div class="pt-4 flex items-center justify-between border-t border-white/5">
                     <button (click)="mostrandoRegistroCliente = true" class="text-[10px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all">Registro Manual</button>
                     <button (click)="confirmarInicioTramite()" [disabled]="!clienteSeleccionado" 
                             class="px-8 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/40 disabled:opacity-30 transition-all active:scale-95">
                       Confirmar e Iniciar
                     </button>
                  </div>
                } @else {
                  <!-- Inline Registration Form -->
                  <div class="grid grid-cols-2 gap-4 animate-in slide-in-from-right duration-300">
                    <div class="col-span-2 flex items-center gap-2 mb-2">
                       <button (click)="mostrandoRegistroCliente = false" class="text-xs text-indigo-400 hover:underline">← Volver a búsqueda</button>
                    </div>
                    <div>
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">Nombre</label>
                      <input [(ngModel)]="formNuevoCliente.nombre" placeholder="Nombre" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div>
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">Apellido</label>
                      <input [(ngModel)]="formNuevoCliente.apellido" placeholder="Apellido" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div class="col-span-2">
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">CI / Identificación</label>
                      <input [(ngModel)]="formNuevoCliente.ci" (input)="soloNumeros($event, 'ci')" placeholder="CI o Cédula" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div>
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">Email</label>
                      <input [(ngModel)]="formNuevoCliente.correo" placeholder="email@ejemplo.com" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div>
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">Teléfono</label>
                      <input [(ngModel)]="formNuevoCliente.telefono" (input)="soloNumeros($event, 'telefono')" placeholder="Teléfono" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div class="col-span-2">
                      <label class="block text-[9px] font-black text-slate-500 uppercase mb-2 ml-1">Dirección</label>
                      <input [(ngModel)]="formNuevoCliente.direccion" placeholder="Dirección completa" class="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500">
                    </div>
                    <div class="col-span-2 pt-4">
                       <button (click)="registrarClienteInline()" 
                               class="w-full py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">
                         Registrar y Seleccionar
                       </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </main>
      }

      @if (vista === 'repositorio') {
        <main class="flex-1 overflow-y-auto relative bg-slate-950">
          <app-repositorio></app-repositorio>
        </main>
      }

      <app-voice-filler-modal 
        [fields]="getFields()" 
        [visible]="mostrarModalVoz"
        (onClose)="cerrarModalVoz()" 
        (onApplied)="aplicarDatosVoz($event)">
      </app-voice-filler-modal>

      @if (mostrarEditorBorrador()) {
        <app-editor-colaborativo 
          [tramiteId]="tareaActiva!.tramiteId"
          [readOnly]="esSoloLectura()"
          (onClose)="cerrarEditorBorrador()"
          (onSave)="onBorradorGuardado($event)">
        </app-editor-colaborativo>
      }

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
export class FuncionarioComponent implements OnInit, OnDestroy {
  vista: 'bandeja' | 'disponible' | 'historial' | 'iniciar' | 'repositorio' | 'colaborativo' = 'bandeja';
  
  // TensorFlow Live Prediction
  prediccionCargando = signal<boolean>(false);
  prediccionError = signal<boolean>(false);
  prediccionActual = signal<any | null>(null);
  private tfService = inject(TensorflowService);
  private colSvc = inject(ColaboracionService);

  // Data
  politicasActivas: PoliticaDTO[] = [];
  tareasDepartamento = signal<RegistroActividadDTO[]>([]);
  tareasCoEdicionDeduplicadas = computed(() => {
    const tareas = this.tareasDepartamento();
    const seen = new Set<string>();
    return tareas.filter(t => {
      if (!t.tramiteId) return true;
      if (seen.has(t.tramiteId)) return false;
      seen.add(t.tramiteId);
      return true;
    });
  });
  editoresPorTramite = signal<Record<string, ColaboradorDTO[]>>({});
  private pollerEditores: any = null;
  esCoEdicionActivaDirecta = false;
  
  // Modal Form
  tareaActiva: RegistroActividadDTO | null = null;
  detalleHistorial: RegistroActividadDTO | null = null;
  formData: Record<string, any> = {};
  uploadingFiles: Record<string, boolean> = {};
  isUploadingGeneral = false;
  archivosCargados: any[] = [];
  formularioNotas = '';
  mostrandoAddExtra = false;
  mostrarModalVoz = false;
  mostrarEditorBorrador = signal(false);

  // UI Icons
  private sanitizer = inject(DomSanitizer);
  
  menu: { view: 'bandeja' | 'disponible' | 'historial' | 'iniciar' | 'repositorio' | 'colaborativo', label: string, svg: string, safeSvg?: SafeHtml }[] = [
    { view: 'bandeja', label: 'Mis Tareas', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>` },
    { view: 'disponible', label: 'Disponibles', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5 4 4"/><path d="M13 7 8.5 2.5a2.12 2.12 0 0 0-3 0L2.5 5.5a2.12 2.12 0 0 0 0 3L7 13"/><path d="m9 15 4 4"/><path d="M11 17l4.5 4.5a2.12 2.12 0 0 0 3 0l3-3a2.12 2.12 0 0 0 0-3L17 11"/><path d="m12 12 4-4"/><path d="m8 16 4-4"/></svg>` },
    { view: 'colaborativo', label: 'Co-Edición en Vivo', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { view: 'historial', label: 'Historial', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>` },
    { view: 'repositorio', label: 'Repositorio', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>` },
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
  guardando = signal<boolean>(false);
  procesandoId = signal<string>(''); // ID del item en proceso para evitar doble-clic

  // --- CLIENTES ---
  modalClienteOpen = false;
  busquedaCliente = '';
  clientesEncontrados = signal<ClienteDTO[]>([]);
  clienteSeleccionado: ClienteDTO | null = null;
  politicaParaIniciar: PoliticaDTO | null = null;
  mostrandoRegistroCliente = false;
  formNuevoCliente: Partial<ClienteDTO> = { nombre: '', apellido: '', ci: '', correo: '', telefono: '', direccion: '' };

  // --- REQUIRED DOCUMENTS / PREREQUISITES ---
  prereqFilesList: any[] = [];
  subiendoPrerequisito: Record<string, boolean> = {};
  subiendoDocRequerido: Record<string, boolean> = {};
  prereqInputs: Record<string, string> = {};

  private cs = inject(ClienteService);
  private offlineStorage = inject(OfflineStorageService);
  public onlineStatus = inject(OnlineStatusService);
  private uploadQueue = inject(OfflineUploadQueueService);

  get deptoNombre() {
    return (this.auth.usuario() as any)?.departamento || 'Funcionario';
  }

  soloNumeros(event: Event, campo: 'ci' | 'telefono') {
    const input = event.target as HTMLInputElement;
    // Replace anything that is not a digit
    const onlyNums = input.value.replace(/[^0-9]/g, '');
    input.value = onlyNums;
    if (campo === 'ci') {
      this.formNuevoCliente.ci = onlyNums;
    } else {
      this.formNuevoCliente.telefono = onlyNums;
    }
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
    const pendientes = this.workflowService.tareasPendientes();
    const disponibles = this.workflowService.tareasNoAsignadas();
    
    const user = this.auth.usuario();
    
    const hoy = new Date().setHours(0,0,0,0);
    const completadasHoy = hist.filter(h => h.completadoEn && new Date(h.completadoEn).getTime() > hoy).length;
    
    // Tareas que el funcionario agarró (Por Hacer)
    const porHacer = pendientes.length;
    // Tareas disponibles en el mercado
    const mercado = disponibles.length;
    
    // Eficiencia: Basada en tareas completadas vs total asignadas históricamente
    const totalVIda = hist.length + porHacer;
    const eficiencia = totalVIda > 0 ? Math.round((hist.length / totalVIda) * 100) : 100;
    
    return {
      completadasHoy,
      porHacer,
      disponibles: mercado,
      eficiencia: eficiencia + '%'
    };
  }

  constructor(
    public workflowService: WorkflowService,
    public auth: AuthService,
    private route: ActivatedRoute,
    private politicaService: PoliticaService,
    private archivoService: ArchivoService,
    public fs: FormularioService
  ) {
    effect(() => {
      const user = this.auth.usuario();
      const v = this.vista;
      if (user) {
        untracked(() => this.cargarDatos());
      }
    });

    // Listen to offline upload queue completion events
    this.uploadQueue.syncFinished$.subscribe((result) => {
      if (result.success && result.fileId) {
        // 1. General files
        const idx = this.archivosCargados.findIndex(f => f.id === `offline://${result.uploadId}`);
        if (idx !== -1) {
          this.archivosCargados[idx].id = result.fileId;
          this.archivosCargados[idx].path = result.url || this.archivoService.getDownloadUrl(result.fileId);
          this.archivosCargados[idx].offline = false;
        }

        // 2. Form fields (dynamic file uploads)
        for (const key of Object.keys(this.formData)) {
          const val = this.formData[key];
          if (val && val.id === `offline://${result.uploadId}`) {
            this.formData[key] = {
              ...val,
              id: result.fileId,
              path: result.url || this.archivoService.getDownloadUrl(result.fileId),
              offline: false
            };
          }
        }
        this.showToast('Archivo offline sincronizado correctamente', 'success');
      } else {
        this.showToast(`Error al sincronizar archivo offline: ${result.error}`, 'error');
      }
    });
  }

  ngOnInit(): void {
    this.menu.forEach(m => m.safeSvg = this.getSafeIcon(m.svg));

    // Escuchar parámetros de ruta para navegación directa (ej: desde el chatbot)
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'] as any;
        if (['bandeja', 'disponible', 'historial', 'iniciar'].includes(tab)) {
          this.vista = tab;
        }
      }
      this.cargarDatos();
    });

    // Prefetch para agilidad
    const user = this.auth.usuario();
    if (user) {
      this.politicaService.listarIniciables(user.tenantId, user.departamentoId || '', user.rol).subscribe(p => this.politicasActivas = p);
    }
  }

  setVista(v: any) {
    this.vista = v;
    if (this.pollerEditores) {
      clearInterval(this.pollerEditores);
      this.pollerEditores = null;
    }
    
    if (v === 'bandeja' || v === 'disponible' || v === 'historial') {
      this.cargarDatos(false);
    } else if (v === 'colaborativo') {
      this.cargarTareasDepartamento();
      this.pollerEditores = setInterval(() => {
        this.actualizarEditoresParaTareas(this.tareasCoEdicionDeduplicadas());
      }, 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.pollerEditores) {
      clearInterval(this.pollerEditores);
    }
  }

  cargarTareasDepartamento() {
    const user = this.auth.usuario();
    if (!user || !user.departamentoId) return;
    this.cargando.set(true);
    this.workflowService.obtenerBandejaDepartamento(user.departamentoId).subscribe({
      next: (data) => {
        this.tareasDepartamento.set(data);
        this.actualizarEditoresParaTareas(this.tareasCoEdicionDeduplicadas());
        this.cargando.set(false);
      },
      error: (e) => {
        console.error(e);
        this.cargando.set(false);
        this.showToast('Error al cargar la bandeja del departamento', 'error');
      }
    });
  }

  actualizarEditoresParaTareas(tareas: RegistroActividadDTO[]) {
    if (!tareas || tareas.length === 0) return;
    const currentMap = { ...this.editoresPorTramite() };
    tareas.forEach(t => {
      this.colSvc.obtenerEditoresActivos(t.tramiteId).subscribe({
        next: (colabs) => {
          currentMap[t.tramiteId] = colabs;
          this.editoresPorTramite.set({ ...currentMap });
        },
        error: () => {}
      });
    });
  }

  unirseAlBorrador(t: RegistroActividadDTO) {
    this.tareaActiva = t;
    this.esCoEdicionActivaDirecta = true;
    this.mostrarEditorBorrador.set(true);
  }

  tomarYUnirse(t: RegistroActividadDTO) {
    if (this.procesandoId()) return;
    this.procesandoId.set(t.id);
    this.workflowService.tomarTarea(t.id, this.auth.usuario()!.id).subscribe({
      next: (res) => {
        this.procesandoId.set('');
        this.showToast('Tarea tomada con éxito', 'success');
        res.estado = 'EN_PROGRESO';
        this.unirseAlBorrador(res);
        this.cargarTareasDepartamento();
      },
      error: (e) => {
        this.procesandoId.set('');
        this.showToast(e.error?.message || 'Error al tomar la tarea', 'error');
      }
    });
  }

  cargarDatos(showSpinner: boolean = false) {
    const user = this.auth.usuario();
    if (!user) return;
    
    // Activar spinner solo si es requerido o es la primera carga (sin datos locales)
    const pending = this.workflowService.tareasPendientes();
    const hist = this.workflowService.historial();
    const shouldShow = showSpinner || (pending.length === 0 && hist.length === 0);

    if (shouldShow) {
      setTimeout(() => this.cargando.set(true));
    }

    let completados = 0;
    const total = 2;
    const checkFinalize = () => {
      completados++;
      if (completados >= total) {
        setTimeout(() => this.cargando.set(false));
      }
    };

    // 1. Cargar Bandeja
    this.workflowService.cargarBandejaUnificada(user.id, user.departamentoId || '')
      .subscribe({
        next: () => checkFinalize(),
        error: (e) => {
          console.error('Error cargando bandeja unificada:', e);
          checkFinalize();
        }
      });

    // 2. Cargar Historial
    this.workflowService.cargarHistorial(user.id)
      .subscribe({
        next: () => checkFinalize(),
        error: (e) => {
          console.error('Error cargando historial:', e);
          checkFinalize();
        }
      });

    // Si estamos en la vista de iniciar trámite, también cargar las políticas iniciables
    if (this.vista === 'iniciar') {
      this.politicaService.listarIniciables(user.tenantId, user.departamentoId || '', user.rol).subscribe(p => {
        this.politicasActivas = p;
      });
    }

    // Cargar plantillas de formularios
    this.fs.listarPorTenant(user.tenantId).subscribe();
  }

  getTitulo() {
    return { bandeja: 'Tareas Pendientes', disponible: 'Mercado de Tareas', historial: 'Control de Rendimiento', iniciar: 'Nuevo Trámite', repositorio: 'Repositorio Documental', colaborativo: 'Co-Edición en Vivo' }[this.vista];
  }

  getSubtitulo() {
    return { 
      bandeja: 'Gestiona las actividades asignadas a tu departamento.', 
      disponible: 'Toma tareas libres y acelera el flujo de trabajo.', 
      historial: 'Analiza tu progreso y el historial de acciones.',
      iniciar: 'Pon en marcha una nueva política de negocio.',
      repositorio: 'Consulta y gestiona los archivos subidos.',
      colaborativo: 'Edita borradores de documentos en tiempo real con tu equipo.'
    }[this.vista];
  }

  getTareas() {
    if (this.vista === 'bandeja') return this.workflowService.tareasPendientes();
    if (this.vista === 'disponible') return this.workflowService.tareasNoAsignadas();
    if (this.vista === 'historial') return this.workflowService.historial();
    return [];
  }

  abrirEditorBorrador() {
    this.mostrarEditorBorrador.set(true);
  }

  cerrarEditorBorrador() {
    this.mostrarEditorBorrador.set(false);
    if (this.esCoEdicionActivaDirecta) {
      this.tareaActiva = null;
      this.esCoEdicionActivaDirecta = false;
    }
  }

  onBorradorGuardado(html: string) {
    this.showToast('Borrador colaborativo guardado', 'success');
  }

  esSoloLectura(): boolean {
    if (!this.tareaActiva) return true;
    if (this.tareaActiva.estado === 'PENDIENTE') return true;

    if (this.tareaActiva.actividadNombre === 'Revisión y Firma de Documento') {
      const user = this.auth.usuario();
      if (!user) return true;
      const esAdmin = user.rol === 'ADMINISTRADOR';
      const esGerencia = user.departamentoId === 'de111111-1111-1111-1111-111111111111' || user.departamentoId === 'ds111111-1111-1111-1111-111111111111';
      return !esAdmin && !esGerencia;
    }

    return false;
  }

  // ACCIONES
  tomarTarea(t: RegistroActividadDTO) {
    if (this.procesandoId()) return; // Guard: ya hay una operación en curso
    this.procesandoId.set(t.id);
    this.workflowService.tomarTarea(t.id, this.auth.usuario()!.id).subscribe({
      next: () => { this.procesandoId.set(''); this.showToast('Tarea tomada con éxito', 'success'); this.cargarDatos(); },
      error: (e) => { this.procesandoId.set(''); this.showToast(e.error?.message || 'Error al tomar tarea', 'error'); }
    });
  }

  comenzarTarea(t: RegistroActividadDTO) {
    if (this.procesandoId()) return;
    this.tomarTarea(t);
  }

  abrirFormulario(t: RegistroActividadDTO) {
    this.tareaActiva = t;
    this.formData = { ...(t.datosFormulario || {}) };
    this.archivosCargados = [...(t.archivos || [])];
    this.formularioNotas = t.notas || '';

    // Predicción en tiempo real de TensorFlow
    this.prediccionCargando.set(true);
    this.prediccionError.set(false);
    this.prediccionActual.set(null);

    const user = this.auth.usuario();
    this.tfService.predict({
      hora_del_dia: new Date().getHours(),
      dia_de_semana: Math.max(0, new Date().getDay() - 1), // Lunes=0, ..., Domingo=6
      departamento_id: t.departamentoId || user?.departamentoId || 'default',
      politica_id: t.politicaId || 'default',
      carga_actual: this.getTareas().length,
      historial_cliente: 0.75
    }).subscribe({
      next: (res) => {
        this.prediccionActual.set(res);
        this.prediccionCargando.set(false);
      },
      error: (e) => {
        console.error('Error al obtener predicción de TensorFlow:', e);
        this.prediccionError.set(true);
        this.prediccionCargando.set(false);
        // Fallback demo data
        this.prediccionActual.set({
          rutaSugerida: 'Revisión y Aprobación',
          tiempoEstimadoMinutos: 45,
          prioridadRecomendada: 'MEDIA',
          isAnomalo: false,
          scoreEficiencia: 0.88
        });
      }
    });
  }

  getFields() {
    if (!this.tareaActiva?.esquemaFormulario) return [];
    return (this.tareaActiva.esquemaFormulario as any).fields || [];
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingGeneral = true;
      if (!this.onlineStatus.isOnline()) {
        this.showToast('Sin conexión. Archivo encolado para sincronización.', 'success');
        this.offlineStorage.addPendingUpload(
          file.name,
          file.type,
          file,
          this.tareaActiva?.tramiteId || '',
          'general_attachment'
        ).then(pending => {
          this.archivosCargados.push({
            id: `offline://${pending.id}`,
            nombre: file.name,
            size: file.size,
            path: '',
            tipo: file.type,
            subidoEn: new Date().toISOString(),
            offline: true
          });
          this.isUploadingGeneral = false;
        }).catch(err => {
          console.error('Offline storage error:', err);
          this.isUploadingGeneral = false;
          this.showToast('Error al encolar archivo', 'error');
        });
        return;
      }

      this.showToast('Subiendo archivo...', 'success');
      this.archivoService.subir(file).subscribe({
        next: (res) => {
          this.archivosCargados.push({
            id: res.id,
            nombre: file.name,
            size: file.size,
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
      
      if (!this.onlineStatus.isOnline()) {
        this.showToast('Sin conexión. Archivo encolado para sincronización.', 'success');
        this.offlineStorage.addPendingUpload(
          file.name,
          file.type,
          file,
          this.tareaActiva?.tramiteId || '',
          key
        ).then(pending => {
          this.formData[key] = {
            id: `offline://${pending.id}`,
            nombre: file.name,
            tamano: file.size,
            path: '',
            tipo: file.type,
            subidoEn: new Date().toISOString(),
            offline: true
          };
          this.uploadingFiles = { ...this.uploadingFiles, [key]: false };
        }).catch(err => {
          console.error('Offline storage error:', err);
          this.uploadingFiles = { ...this.uploadingFiles, [key]: false };
          this.showToast('Error al encolar archivo', 'error');
        });
        return;
      }

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
    
    // VALIDACIÓN DE DOCUMENTOS REQUERIDOS OBLIGATORIOS
    if (this.tareaActiva.documentosRequeridos && this.tareaActiva.documentosRequeridos.length > 0) {
      for (const doc of this.tareaActiva.documentosRequeridos) {
        if (!this.tieneDocumentoRequerido(doc)) {
          this.showToast(`Falta subir el documento obligatorio: "${doc}"`, 'error');
          return;
        }
      }
    }
    
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
    
    this.guardando.set(true);
    
    this.workflowService.completarTarea(req, this.auth.usuario()!.id).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.showToast('Actividad completada y derivada', 'success');
        this.cargarDatos();
      },
      error: (e) => {
        this.guardando.set(false);
        this.showToast(e.error?.message || 'Error al completar', 'error');
      }
    });
  }

  verDetalleHistorial(h: RegistroActividadDTO) {
    this.detalleHistorial = h;
  }

  getFieldLabel(key: string, registro: RegistroActividadDTO): string {
    const sKey = String(key);
    if (!registro.esquemaFormulario) return sKey;
    const fields = (registro.esquemaFormulario as any).fields || [];
    const field = fields.find((f: any) => f.key === sKey);
    return field ? field.label : sKey;
  }

  getFileUrl(file: any): string {
    const rawUrl = file.path || file.url || `/api/archivos/download/${file.id}`;
    if (rawUrl && rawUrl.startsWith('/api')) {
      return environment.apiUrl.replace('/api', '') + rawUrl;
    }
    return rawUrl;
  }

  cerrarModal() { this.tareaActiva = null; }

  abrirModalVoz() {
    this.mostrarModalVoz = true;
  }

  cerrarModalVoz() {
    this.mostrarModalVoz = false;
  }

  aplicarDatosVoz(valores: any) {
    if (valores) {
      for (const key of Object.keys(valores)) {
        if (valores[key] !== null && valores[key] !== undefined) {
          this.formData[key] = valores[key];
        }
      }
      this.showToast('Formulario auto-llenado por voz con éxito', 'success');
    }
  }

  abrirSeleccionCliente(p: PoliticaDTO) {
    this.politicaParaIniciar = p;
    this.modalClienteOpen = true;
    this.clienteSeleccionado = null;
    this.busquedaCliente = '';
    this.mostrandoRegistroCliente = false;
    this.clientesEncontrados.set([]);
  }

  buscarClientes() {
    if (!this.busquedaCliente) return;
    const tid = this.auth.usuario()?.tenantId || '';
    this.cs.buscar(tid, this.busquedaCliente).subscribe(res => this.clientesEncontrados.set(res));
  }

  seleccionarCliente(c: ClienteDTO) {
    this.clienteSeleccionado = c;
  }

  registrarClienteInline() {
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;
    this.formNuevoCliente.tenantId = tid;
    this.cs.crear(this.formNuevoCliente).subscribe({
      next: (res) => {
        this.clienteSeleccionado = res;
        this.mostrandoRegistroCliente = false;
        this.showToast('Cliente registrado correctamente', 'success');
      },
      error: (e) => this.showToast(e.error?.message || 'Error al registrar cliente', 'error')
    });
  }

  confirmarInicioTramite() {
    if (!this.politicaParaIniciar || !this.clienteSeleccionado) return;
    
    // Validar prerrequisitos si existen
    if (this.politicaParaIniciar.requisitosIniciales && this.politicaParaIniciar.requisitosIniciales.length > 0) {
      for (const req of this.politicaParaIniciar.requisitosIniciales) {
        if (!this.tienePrerequisito(req)) {
          this.showToast(`Falta subir el documento obligatorio: "${req}"`, 'error');
          return;
        }
      }
    }
    
    this.iniciarTramite(this.politicaParaIniciar, this.clienteSeleccionado);
  }

  iniciarTramite(p: PoliticaDTO, cliente?: ClienteDTO) {
    this.procesandoId.set(p.id);
    const user = this.auth.usuario();
    
    const request = { 
      politicaId: p.id,
      usuarioId: user?.id,
      clienteId: cliente?.id,
      documentoCliente: cliente?.ci,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : undefined,
      archivosIniciales: this.prereqFilesList
    };
    console.log('Enviando iniciar tramite:', request);

    this.workflowService.iniciarTramite(request).subscribe({
      next: () => {
        this.procesandoId.set('');
        this.modalClienteOpen = false;
        this.prereqFilesList = [];
        this.showToast('Nuevo trámite iniciado con éxito', 'success');
        this.setVista('bandeja');
      },
      error: (e) => { 
        this.procesandoId.set(''); 
        console.error('Error detallado al iniciar trámite:', e);
        this.showToast(e.error?.message || e.message || 'Error al iniciar trámite', 'error'); 
      }
    });
  }

  // --- HELPERS PARA PRERREQUISITOS ---
  getCleanReqName(req: string): string {
    if (!req) return '';
    return req.replace(/^\[(Texto|Número|Fecha|Archivo|Selección)\]\s*/i, '');
  }

  getReqType(req: string): string {
    if (!req) return 'archivo';
    const match = req.match(/^\[(Texto|Número|Fecha|Archivo|Selección)\]/i);
    return match ? match[1].toLowerCase() : 'archivo';
  }

  onPrereqInputChanged(req: string, event: any): void {
    const val = (event.target as HTMLInputElement).value;
    this.prereqInputs[req] = val;

    // Remover anterior
    this.prereqFilesList = this.prereqFilesList.filter(p => p.nombreRequisito !== req);

    if (val.trim()) {
      this.prereqFilesList.push({
        id: 'text-' + Math.random().toString(36).substring(2, 9),
        nombre: this.getCleanReqName(req),
        path: val.trim(),
        tipo: 'text/plain',
        size: val.trim().length,
        subidoEn: new Date().toISOString(),
        nombreRequisito: req
      });
    }
  }

  tienePrerequisito(req: string): boolean {
    return this.prereqFilesList.some(p => p.nombreRequisito === req);
  }

  getPrerequisitoNombre(req: string): string {
    const found = this.prereqFilesList.find(p => p.nombreRequisito === req);
    return found ? found.nombre : '';
  }

  eliminarPrerequisito(req: string): void {
    this.prereqFilesList = this.prereqFilesList.filter(p => p.nombreRequisito !== req);
    if (this.prereqInputs[req]) {
      this.prereqInputs[req] = '';
    }
  }

  onPrereqFileSelected(event: any, req: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.subiendoPrerequisito[req] = true;

      this.showToast(`Subiendo ${file.name}...`, 'success');
      this.archivoService.subir(file).subscribe({
        next: (res) => {
          this.prereqFilesList.push({
            id: res.id,
            nombre: file.name,
            size: file.size,
            path: res.url || this.archivoService.getDownloadUrl(res.id),
            tipo: file.type,
            subidoEn: new Date().toISOString(),
            nombreRequisito: req
          });
          this.subiendoPrerequisito[req] = false;
          this.showToast(`Prerrequisito "${req}" subido con éxito`, 'success');
        },
        error: (err) => {
          console.error('Prereq upload error:', err);
          this.subiendoPrerequisito[req] = false;
          this.showToast('Error al subir el prerrequisito', 'error');
        }
      });
    }
  }

  // --- HELPERS PARA DOCUMENTOS REQUERIDOS EN TAREAS ---
  tieneDocumentoRequerido(doc: string): boolean {
    return this.archivosCargados.some(a => a.nombreRequisito === doc);
  }

  getDocumentoRequeridoNombre(doc: string): string {
    const found = this.archivosCargados.find(a => a.nombreRequisito === doc);
    return found ? found.nombre : '';
  }

  eliminarDocumentoRequerido(doc: string): void {
    this.archivosCargados = this.archivosCargados.filter(a => a.nombreRequisito !== doc);
  }

  onRequiredFileSelected(event: any, doc: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.subiendoDocRequerido[doc] = true;

      this.showToast(`Subiendo ${file.name}...`, 'success');
      this.archivoService.subir(file).subscribe({
        next: (res) => {
          this.archivosCargados.push({
            id: res.id,
            nombre: file.name,
            size: file.size,
            path: res.url || this.archivoService.getDownloadUrl(res.id),
            tipo: file.type,
            subidoEn: new Date().toISOString(),
            nombreRequisito: doc
          });
          this.subiendoDocRequerido[doc] = false;
          this.showToast(`Documento "${doc}" subido con éxito`, 'success');
        },
        error: (err) => {
          console.error('Required upload error:', err);
          this.subiendoDocRequerido[doc] = false;
          this.showToast('Error al subir el documento requerido', 'error');
        }
      });
    }
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg; this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }
}

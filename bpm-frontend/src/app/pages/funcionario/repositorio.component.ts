import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RepositorioService, RepositorioDTO } from '../../services/repositorio.service';
import { ColaboracionService } from '../../services/colaboracion.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

type NivelActual = 'ROOT' | 'POLITICA' | 'CLIENTE' | 'TRAMITE';

@Component({
  selector: 'app-repositorio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col p-8 animate-in fade-in duration-500">
      
      <!-- HEADER & BREADCRUMBS -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            Repositorio Documental
          </h1>
          <p class="text-sm text-slate-400 mt-2 font-medium">Archivos centralizados por políticas y clientes.</p>
        </div>
      </div>

      <!-- BREADCRUMBS GLASSMORPHISM -->
      <div class="mb-8 p-4 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/5 shadow-xl flex items-center gap-3">
        <button (click)="goTo('ROOT')" 
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                [class]="nivel() === 'ROOT' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Inicio
        </button>

        @if (nivel() !== 'ROOT') {
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-600"><path d="m9 18 6-6-6-6"/></svg>
          <button (click)="goTo('POLITICA')" 
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                  [class]="nivel() === 'POLITICA' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'">
            {{ seleccionPolitica() }}
          </button>
        }

        @if (nivel() === 'CLIENTE' || nivel() === 'TRAMITE') {
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-600"><path d="m9 18 6-6-6-6"/></svg>
          <button (click)="goTo('CLIENTE')" 
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                  [class]="nivel() === 'CLIENTE' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'">
            {{ seleccionCliente() }}
          </button>
        }

        @if (nivel() === 'TRAMITE') {
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-slate-600"><path d="m9 18 6-6-6-6"/></svg>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold bg-indigo-500/20 text-indigo-400">
            {{ seleccionTramite() }}
          </div>
        }
      </div>

      <!-- MAIN CONTENT AREA -->
      <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
        
        @if (loading()) {
          <div class="flex flex-col items-center justify-center py-32 animate-pulse">
            <div class="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
            <h3 class="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Sincronizando Repositorio...</h3>
          </div>
        } @else {
          
          <!-- NIVEL 1: POLITICAS -->
          @if (nivel() === 'ROOT') {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              @for (pol of politicas(); track pol) {
                <div (click)="entrarPolitica(pol)" 
                     class="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800/60 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all cursor-pointer shadow-xl ring-1 ring-white/5">
                  <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                  </div>
                  <h3 class="text-lg font-black text-white tracking-tight mb-2">{{ pol }}</h3>
                  <p class="text-xs font-medium text-slate-500">{{ getClientesForPolitica(pol).length }} Clientes Registrados</p>
                </div>
              }
              @if (politicas().length === 0) {
                <div class="col-span-full py-20 text-center">
                  <div class="text-5xl opacity-20 mb-4">📁</div>
                  <p class="text-slate-400 font-medium">El repositorio está vacío.</p>
                </div>
              }
            </div>
          }

          <!-- NIVEL 2: CLIENTES -->
          @if (nivel() === 'POLITICA') {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
              @for (cli of clientesActuales(); track cli) {
                <div (click)="entrarCliente(cli)" 
                     class="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800/60 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all cursor-pointer shadow-xl ring-1 ring-white/5">
                  <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <h3 class="text-lg font-black text-white tracking-tight mb-2 truncate">{{ cli }}</h3>
                  <p class="text-xs font-medium text-slate-500">{{ getTramitesCount(cli) }} Trámites / {{ getArchivosCount(cli) }} Archivos</p>
                </div>
              }
            </div>
          }

          <!-- NIVEL 3: TRAMITES -->
          @if (nivel() === 'CLIENTE') {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-300">
              @for (tra of tramitesActuales(); track tra) {
                @if (parseTramiteLabel(tra); as parsed) {
                  <div (click)="entrarTramite(tra)" 
                       class="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800/60 hover:bg-sky-500/5 hover:border-sky-500/30 transition-all cursor-pointer shadow-xl ring-1 ring-white/5 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between mb-6">
                        <div class="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                        </div>
                        <span class="px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider border"
                              [class]="parsed.enCurso ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'">
                          {{ parsed.enCurso ? 'En Curso' : 'Completado' }}
                        </span>
                      </div>
                      <h3 class="text-base font-black text-white tracking-tight mb-2 truncate" [title]="parsed.politica">
                        {{ parsed.politica }}
                      </h3>
                      <div class="text-[11px] font-mono text-indigo-400 mb-4 flex items-center gap-1.5">
                        <span class="text-slate-500 font-sans">Código:</span>
                        <span class="bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">#{{ parsed.codigo }}</span>
                      </div>
                    </div>
                    <div class="space-y-2 text-xs text-slate-400 border-t border-white/5 pt-4 mt-2">
                      <div class="flex items-center gap-2" [title]="parsed.fechas">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-slate-500 shrink-0"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <span class="truncate">{{ parsed.fechas }}</span>
                      </div>
                      <div class="flex items-center gap-2 text-slate-500 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                        <span>{{ getArchivosCountForTramite(tra) }} Archivos</span>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- NIVEL 4: ARCHIVOS -->
          @if (nivel() === 'TRAMITE') {
            <!-- INFO COLABORACION PREMIUM -->
            <div class="mb-6 p-5 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 class="text-sm font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Colaboración Documental Activa
                </h4>
                <p class="text-xs text-slate-400 mt-1 font-medium">Trabaja y redacta informes en tiempo real sobre cada documento con tus compañeros de departamento.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-300">
              @for (file of archivosActuales(); track file.id) {
                <div class="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex items-center justify-between group">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20 shadow-lg group-hover:bg-sky-500 group-hover:text-white transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                    </div>
                    <div>
                      <h4 class="text-sm font-bold text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">{{ file.nombreOriginal }}</h4>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">v{{ file.versionActual }}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span class="text-[9px] text-slate-500 uppercase">{{ file.actualizadoEn | date:'mediumDate' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="abrirEditorColaborativo(file)"
                            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all cursor-pointer">
                      Editar
                    </button>
                    <a [href]="getFileUrl(file)" target="_blank"
                       class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-all">
                      Ver Documento
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- MODAL EDITOR COLABORATIVO -->
      @if (mostrarEditorColaborativo()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div class="w-full max-w-7xl h-[90vh] rounded-3xl bg-slate-900/90 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <!-- HEADER -->
            <div class="p-6 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                  <input [ngModel]="docTitulo()" 
                         (ngModelChange)="docTitulo.set($event); guardarDocumento()"
                         class="text-lg font-black text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none py-0.5 px-1 rounded transition-all w-72 md:w-96"
                         placeholder="Título del Documento"/>
                  <p class="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">Editor en Tiempo Real del Departamento</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                @if (guardandoDoc()) {
                  <span class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                    <svg class="animate-spin h-3.5 w-3.5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Guardando...
                  </span>
                } @else {
                  <span class="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Sincronizado
                  </span>
                }
                <button (click)="cerrarEditorColaborativo()" 
                        class="px-5 py-2.5 rounded-xl text-xs font-black text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:text-white transition-all cursor-pointer">
                  Guardar y Cerrar
                </button>
              </div>
            </div>

            <!-- BODY -->
            <div class="flex-1 flex overflow-hidden">
              
              <!-- EDITOR & PREVIEW AREA (LEFT 75%) -->
              <div class="flex-1 flex flex-col p-6 bg-slate-950/20 overflow-hidden">
                <!-- TOOLBAR -->
                <div class="flex items-center justify-between mb-4 p-2 rounded-xl bg-slate-900/60 border border-white/5 shadow-md">
                  <div class="flex items-center gap-1.5">
                    <!-- Bold -->
                    <button (click)="formatText('bold')" title="Negrita" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 12a4 4 0 0 0 0-8H6v8h8Z"/><path d="M15 20a4 4 0 0 0 0-8H6v8h9Z"/></svg>
                    </button>
                    <!-- Italic -->
                    <button (click)="formatText('italic')" title="Cursiva" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>
                    </button>
                    <!-- Divider -->
                    <div class="w-px h-5 bg-white/10 mx-1"></div>
                    <!-- H1 -->
                    <button (click)="formatText('heading1')" title="Título Grande" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold text-xs font-mono">
                      H1
                    </button>
                    <!-- H2 -->
                    <button (click)="formatText('heading2')" title="Subtítulo" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold text-xs font-mono">
                      H2
                    </button>
                    <!-- Divider -->
                    <div class="w-px h-5 bg-white/10 mx-1"></div>
                    <!-- Bullet List -->
                    <button (click)="formatText('list')" title="Lista de Viñetas" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                    </button>
                    <!-- Code block -->
                    <button (click)="formatText('code')" title="Bloque de Código" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </button>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <!-- Undo -->
                    <button (click)="triggerUndo()" [disabled]="undoStack.length <= 1" title="Deshacer (Ctrl+Z)" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                    </button>
                    <!-- Redo -->
                    <button (click)="triggerRedo()" [disabled]="redoStack.length === 0" title="Rehacer (Ctrl+Y)" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
                    </button>
                  </div>
                </div>

                <!-- SPLIT PANEL -->
                <div class="flex-1 flex gap-4 overflow-hidden">
                  <!-- LEFT: EDITOR -->
                  <div class="flex-1 flex flex-col h-full overflow-hidden">
                    <textarea id="editorTextarea"
                              [ngModel]="docContenido()"
                              (input)="onTextInput($event)"
                              (click)="notificarCursor()"
                              (keyup)="notificarCursor()"
                              (keydown)="onKeydown($event)"
                              class="flex-1 w-full bg-slate-900/50 border border-white/5 rounded-2xl p-6 text-slate-200 font-mono text-sm leading-relaxed focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/35 shadow-inner resize-none custom-scrollbar"
                              placeholder="Comienza a redactar aquí... Soporta Markdown."></textarea>
                  </div>

                  <!-- RIGHT: PREVIEW -->
                  <div class="flex-1 flex flex-col h-full bg-slate-900/30 border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar">
                    <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">Vista Previa Renderizada</div>
                    <div class="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed"
                         [innerHTML]="parseMarkdown(docContenido())">
                    </div>
                  </div>
                </div>
              </div>

              <!-- COLLABORATION SIDEBAR (RIGHT 25%) -->
              <div class="w-80 border-l border-white/5 bg-slate-950/30 p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                
                <!-- Colaboradores -->
                <div class="space-y-6">
                  <div>
                    <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Editando Ahora</h5>
                    <div class="space-y-3">
                      <!-- Yo mismo -->
                      <div class="flex items-center gap-2 p-2 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
                        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                          YO
                        </div>
                        <div>
                          <p class="text-xs font-bold text-white">Tú (Creador/Editor)</p>
                          <span class="text-[9px] text-indigo-400 font-bold uppercase">Activo en la sesión</span>
                        </div>
                      </div>
                      
                      <!-- Compañeros -->
                      @for (colab of colabSvc.colaboradoresDoc(); track colab.id) {
                        <div class="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 animate-in slide-in-from-right-4 duration-300">
                          <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-md"
                               [style.background-color]="colab.color">
                            {{ colab.avatar }}
                          </div>
                          <div>
                            <p class="text-xs font-bold text-slate-200">{{ colab.nombre }}</p>
                            <span class="text-[9px] text-emerald-400 font-bold tracking-wider flex items-center gap-1 uppercase">
                              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              En línea
                            </span>
                          </div>
                        </div>
                      }
                      
                      @if (colabSvc.colaboradoresDoc().length === 0) {
                        <p class="text-[10px] text-slate-600 font-medium italic py-2">No hay otros compañeros en esta sesión.</p>
                      }
                    </div>
                  </div>

                  <!-- REGISTRO DE ACTIVIDAD -->
                  <div>
                    <h5 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Registro de Actividad</h5>
                    <div class="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                      @for (act of actividades(); track act.hora + act.usuario + act.accion) {
                        <div class="text-[11px] leading-relaxed p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                          <div class="flex items-center justify-between mb-1">
                            <span class="font-bold text-slate-200" [style.color]="act.color">{{ act.usuario }}</span>
                            <span class="text-slate-500 font-mono text-[9px]">{{ act.hora }}</span>
                          </div>
                          <p class="text-slate-400 font-medium">{{ act.accion }}</p>
                        </div>
                      }
                      @if (actividades().length === 0) {
                        <p class="text-[10px] text-slate-600 font-medium italic py-2">No hay actividad registrada aún.</p>
                      }
                    </div>
                  </div>

                  <!-- Metadata -->
                  <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Detalles del Documento</h5>
                    <div class="flex justify-between text-[10px]">
                      <span class="text-slate-500 font-medium">Última edición:</span>
                      <span class="text-slate-300 font-bold truncate max-w-[120px]">{{ docColaborativo()?.ultimoEditor || 'Sistema' }}</span>
                    </div>
                    <div class="flex justify-between text-[10px]">
                      <span class="text-slate-500 font-medium">Última actualización:</span>
                      <span class="text-slate-300 font-bold">{{ docColaborativo()?.actualizadoEn | date:'shortTime' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Markdown Cheatsheet -->
                <div class="mt-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                  <h5 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Sintaxis Markdown</h5>
                  <ul class="text-[10px] text-slate-500 space-y-2 font-medium font-mono">
                    <li><code class="text-indigo-400 font-bold bg-white/5 px-1 rounded"># Título</code> - H1</li>
                    <li><code class="text-indigo-400 font-bold bg-white/5 px-1 rounded">## Sub</code> - H2</li>
                    <li><code class="text-indigo-400 font-bold bg-white/5 px-1 rounded">**Texto**</code> - Negrita</li>
                    <li><code class="text-indigo-400 font-bold bg-white/5 px-1 rounded">*Texto*</code> - Itálica</li>
                    <li><code class="text-indigo-400 font-bold bg-white/5 px-1 rounded">- Elemento</code> - Viñeta</li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>
      }
    </div>
  `
})
export class RepositorioComponent implements OnInit, OnDestroy {
  private repoService = inject(RepositorioService);
  public colabSvc = inject(ColaboracionService);
  private authService = inject(AuthService);

  private subs = new Subscription();

  loading = signal(true);
  data = signal<any>({}); // The full nested map
  
  nivel = signal<NivelActual>('ROOT');
  seleccionPolitica = signal<string | null>(null);
  seleccionCliente = signal<string | null>(null);
  seleccionTramite = signal<string | null>(null);

  // Colaboración
  mostrarEditorColaborativo = signal(false);
  docColaborativo = signal<any>(null);
  docContenido = signal<string>('');
  docTitulo = signal<string>('');
  guardandoDoc = signal(false);

  // Undo/Redo y Log de Actividad
  undoStack: string[] = [];
  redoStack: string[] = [];
  actividades = signal<{ hora: string, usuario: string, accion: string, color: string }[]>([]);
  private lastSavedContent = '';
  private typingTimeout: any;

  politicas = computed(() => {
    return Object.keys(this.data() || {}).sort();
  });

  clientesActuales = computed(() => {
    const pol = this.seleccionPolitica();
    if (!pol) return [];
    return Object.keys(this.data()[pol] || {}).sort();
  });

  tramitesActuales = computed(() => {
    const pol = this.seleccionPolitica();
    const cli = this.seleccionCliente();
    if (!pol || !cli) return [];
    return Object.keys(this.data()[pol][cli] || {}).sort();
  });

  archivosActuales = computed(() => {
    const pol = this.seleccionPolitica();
    const cli = this.seleccionCliente();
    const tra = this.seleccionTramite();
    if (!pol || !cli || !tra) return [];
    return this.data()[pol][cli][tra] || [];
  });

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading.set(true);
    this.repoService.getRepositorioDocumental().subscribe({
      next: (res) => {
        this.data.set(res.agrupacion || {});
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando repositorio', err);
        this.loading.set(false);
      }
    });
  }

  abrirEditorColaborativo(file: any) {
    if (!file || !file.id) return;

    this.loading.set(true);
    this.repoService.buscarODocumentoColaborativo(file.id).subscribe({
      next: (doc) => {
        this.docColaborativo.set(doc);
        this.docContenido.set(doc.contenido || '');
        this.docTitulo.set(doc.titulo || '');
        this.mostrarEditorColaborativo.set(true);
        this.loading.set(false);

        // Inicializar pilas e historial
        this.undoStack = [doc.contenido || ''];
        this.redoStack = [];
        this.lastSavedContent = doc.contenido || '';
        this.actividades.set([]);

        // Conectar a la sala WebSocket del documento
        this.colabSvc.conectarDocRoom(doc.id);

        // Suscribirse a las actualizaciones de edición
        this.subs.add(
          this.colabSvc.docEdits$.subscribe((msg) => {
            const textarea = document.getElementById('editorTextarea') as HTMLTextAreaElement;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              this.docContenido.set(msg.payload);
              this.saveUndoState(msg.payload);
              // Ejecutar en el siguiente tick para mantener el cursor
              setTimeout(() => {
                textarea.setSelectionRange(start, end);
              });
            } else {
              this.docContenido.set(msg.payload);
              this.saveUndoState(msg.payload);
            }
          })
        );

        // Suscribirse a la actividad del log del documento
        this.subs.add(
          this.colabSvc.docLogs$.subscribe((msg) => {
            const timeStr = this.getFormattedTime();
            const newAct = {
              hora: timeStr,
              usuario: msg.colaborador.nombre,
              accion: msg.payload,
              color: msg.colaborador.color || '#10b981'
            };
            this.actividades.update(list => [newAct, ...list]);
          })
        );

        // Registrar unión local y remota
        setTimeout(() => {
          const timeStr = this.getFormattedTime();
          this.registrarActividadLocal(timeStr, 'se unió a la sesión');
        }, 500);
      },
      error: (err) => {
        console.error('Error cargando documento colaborativo', err);
        this.loading.set(false);
      }
    });
  }

  onTextInput(event: Event) {
    const newVal = (event.target as HTMLTextAreaElement).value;
    this.docContenido.set(newVal);
    // Notificar a los otros colaboradores vía WebSocket
    this.colabSvc.notificarEdicionDoc(newVal);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    const isBoundary = 
      newVal.endsWith(' ') || 
      newVal.endsWith('\n') || 
      Math.abs(newVal.length - this.lastSavedContent.length) > 15;

    if (isBoundary) {
      this.saveUndoState(newVal);
    } else {
      this.typingTimeout = setTimeout(() => {
        this.saveUndoState(newVal);
      }, 1000);
    }
  }

  saveUndoState(content: string) {
    if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== content) {
      this.undoStack.push(content);
      this.redoStack = []; // limpiar redo con nueva escritura
      this.lastSavedContent = content;
    }
  }

  notificarCursor() {
    const textarea = document.getElementById('editorTextarea') as HTMLTextAreaElement;
    if (textarea) {
      this.colabSvc.notificarCursorDoc(textarea.selectionStart);
    }
  }

  guardarDocumento() {
    const doc = this.docColaborativo();
    if (!doc) return;

    this.guardandoDoc.set(true);
    const updatedDoc = {
      ...doc,
      titulo: this.docTitulo(),
      contenido: this.docContenido()
    };

    this.repoService.guardarDocumentoColaborativo(doc.id, updatedDoc).subscribe({
      next: (saved) => {
        this.docColaborativo.set(saved);
        this.guardandoDoc.set(false);
      },
      error: (err) => {
        console.error('Error guardando documento', err);
        this.guardandoDoc.set(false);
      }
    });
  }

  cerrarEditorColaborativo() {
    const timeStr = this.getFormattedTime();
    this.colabSvc.notificarAccionDoc('salió de la sesión');

    this.guardarDocumento();
    this.colabSvc.desconectarDocRoom();
    this.mostrarEditorColaborativo.set(false);
    this.docColaborativo.set(null);
    // Limpiar suscripciones locales de edición
    this.subs.unsubscribe();
    this.subs = new Subscription(); // Reinicializar para la próxima vez
  }

  getClientesForPolitica(politica: string) {
    return Object.keys(this.data()[politica] || {});
  }

  getArchivosCount(cliente: string) {
    const pol = this.seleccionPolitica();
    if (!pol) return 0;
    const tramitesMap = this.data()[pol][cliente] || {};
    let count = 0;
    for (const key of Object.keys(tramitesMap)) {
      count += tramitesMap[key].length;
    }
    return count;
  }

  getTramitesCount(cliente: string) {
    const pol = this.seleccionPolitica();
    if (!pol) return 0;
    return Object.keys(this.data()[pol][cliente] || {}).length;
  }

  getArchivosCountForTramite(tramite: string) {
    const pol = this.seleccionPolitica();
    const cli = this.seleccionCliente();
    if (!pol || !cli) return 0;
    const arr = this.data()[pol][cli][tramite];
    return arr ? arr.length : 0;
  }

  parseTramiteLabel(label: string) {
    let politica = 'Trámite';
    let codigo = 'S/C';
    let fechas = 'Fecha desconocida';
    let enCurso = false;

    // Extract code in [#...]
    const codeMatch = label.match(/\[#([^\]]+)\]/);
    if (codeMatch) {
      codigo = codeMatch[1];
    }

    // Extract dates in (Desde ...) at the end of the label
    const datesMatch = label.match(/\(Desde (.*)\)\s*$/);
    if (datesMatch) {
      fechas = 'Desde ' + datesMatch[1];
      if (fechas.includes('En Curso')) {
        enCurso = true;
      }
    }

    // Extract policy name (everything between "Trámite de " and " [#")
    const polMatch = label.match(/Trámite de (.*?) \[#/);
    if (polMatch) {
      politica = polMatch[1];
    } else {
      // Fallback: remove date and code patterns
      politica = label.replace(/\[#.*?\]/, '').replace(/\(Desde.*?\)/, '').trim();
    }

    return { politica, codigo, fechas, enCurso };
  }

  entrarPolitica(pol: string) {
    this.seleccionPolitica.set(pol);
    this.nivel.set('POLITICA');
  }

  entrarCliente(cli: string) {
    this.seleccionCliente.set(cli);
    this.nivel.set('CLIENTE');
  }

  entrarTramite(tra: string) {
    this.seleccionTramite.set(tra);
    this.nivel.set('TRAMITE');
  }

  goTo(target: NivelActual) {
    this.nivel.set(target);
    if (target === 'ROOT') {
      this.seleccionPolitica.set(null);
      this.seleccionCliente.set(null);
      this.seleccionTramite.set(null);
    } else if (target === 'POLITICA') {
      this.seleccionCliente.set(null);
      this.seleccionTramite.set(null);
    } else if (target === 'CLIENTE') {
      this.seleccionTramite.set(null);
    }
  }

  getFileUrl(file: any): string {
    const currentVersion = file.versionActual;
    const revision = file.historial?.find((r: any) => r.version === currentVersion) || 
                     file.historial?.[file.historial.length - 1];
    const s3Key = revision?.s3Key || file.id || file._id;
    return environment.apiUrl.replace('/api', '') + `/api/archivos/download/${s3Key}`;
  }

  // Métodos Premium
  formatText(type: 'bold' | 'italic' | 'heading1' | 'heading2' | 'list' | 'code') {
    const textarea = document.getElementById('editorTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selected || 'texto'}**`;
        cursorOffset = selected ? 0 : 2;
        break;
      case 'italic':
        replacement = `*${selected || 'texto'}*`;
        cursorOffset = selected ? 0 : 1;
        break;
      case 'heading1':
        replacement = `\n# ${selected || 'Título'}\n`;
        cursorOffset = selected ? 0 : 2;
        break;
      case 'heading2':
        replacement = `\n## ${selected || 'Subtítulo'}\n`;
        cursorOffset = selected ? 0 : 3;
        break;
      case 'list':
        replacement = `\n- ${selected || 'Elemento'}\n`;
        cursorOffset = selected ? 0 : 2;
        break;
      case 'code':
        replacement = `\n\`\`\`\n${selected || 'código'}\n\`\`\`\n`;
        cursorOffset = selected ? 0 : 4;
        break;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    
    // Guardar estado previo para deshacer
    this.saveUndoState(text);

    this.docContenido.set(newContent);
    this.colabSvc.notificarEdicionDoc(newContent);

    setTimeout(() => {
      this.saveUndoState(newContent);
      textarea.focus();
      const newCursorPos = start + replacement.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });

    const actionLabel = {
      bold: 'aplicó formato Negrita',
      italic: 'aplicó formato Cursiva',
      heading1: 'añadió Encabezado H1',
      heading2: 'añadió Encabezado H2',
      list: 'insertó una lista',
      code: 'insertó un bloque de código'
    }[type];

    const timeStr = this.getFormattedTime();
    this.registrarActividadLocal(timeStr, actionLabel);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.triggerUndo();
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.triggerRedo();
    }
  }

  triggerUndo() {
    if (this.undoStack.length > 1) {
      const currentState = this.undoStack.pop()!;
      this.redoStack.push(currentState);
      
      const previousState = this.undoStack[this.undoStack.length - 1];
      this.docContenido.set(previousState);
      this.lastSavedContent = previousState;
      this.colabSvc.notificarEdicionDoc(previousState);
      
      const timeStr = this.getFormattedTime();
      this.registrarActividadLocal(timeStr, 'deshizo un cambio (Ctrl+Z)');
    }
  }

  triggerRedo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop()!;
      this.undoStack.push(nextState);
      
      this.docContenido.set(nextState);
      this.lastSavedContent = nextState;
      this.colabSvc.notificarEdicionDoc(nextState);
      
      const timeStr = this.getFormattedTime();
      this.registrarActividadLocal(timeStr, 'rehizo un cambio (Ctrl+Y)');
    }
  }

  getFormattedTime(): string {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  registrarActividadLocal(hora: string, accion: string) {
    const user = this.authService.usuario();
    const userName = user ? (user.nombre + ' ' + (user.apellido || '')) : 'Tú';
    const newAct = {
      hora,
      usuario: userName,
      accion,
      color: '#6366f1'
    };
    this.actividades.update(list => [newAct, ...list]);
    this.colabSvc.notificarAccionDoc(accion);
  }

  parseMarkdown(markdown: string): string {
    if (!markdown) return '';

    // Sanitizar HTML básico para evitar problemas de inyección
    let html = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bloques de código
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950/60 p-4 rounded-xl border border-white/5 font-mono text-xs text-slate-300 my-3 overflow-x-auto"><code>$1</code></pre>');

    // Código inline
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-indigo-300">$1</code>');

    // Encabezados
    html = html.replace(/^\s*# (.*$)/gim, '<h1 class="text-2xl font-black text-white tracking-tight mt-6 mb-3 border-b border-white/10 pb-1">$1</h1>');
    html = html.replace(/^\s*## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-100 tracking-tight mt-4 mb-2">$1</h2>');
    html = html.replace(/^\s*### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-200 tracking-tight mt-3 mb-2">$1</h3>');

    // Negrita
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-extrabold text-white">$1</strong>');

    // Itálica
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-300">$1</em>');

    // Listas de viñetas
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-300 my-1 font-medium">$1</li>');

    // Espaciado y saltos de línea
    html = html.replace(/\n\n/g, '<div class="h-3"></div>');
    html = html.replace(/\n(?!<(li|pre|code|h1|h2|h3))/g, '<br/>');

    return html;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.colabSvc.desconectarDocRoom();
  }
}

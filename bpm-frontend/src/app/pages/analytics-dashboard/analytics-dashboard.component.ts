import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import { MlAnalysisService } from '../../services/ml-analysis.service';
import { AuthService } from '../../services/auth.service';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO } from '../../models/bpm.models';

@Component({
  selector: 'app-nlp-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 pb-32 selection:bg-indigo-500/30">
      
      <!-- Fondo Decorativo con Luces Neón Difusas -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/5 blur-[150px] rounded-full"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-sky-500/5 blur-[120px] rounded-full"></div>
      </div>

      <main class="relative z-10 pt-10 px-6 md:px-16 max-w-7xl mx-auto space-y-10">
        
        <!-- HEADER -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/50 pb-6">
          <div>
            <h1 class="text-3xl font-black tracking-tight bg-gradient-to-r slate-100">
              Reportes AI & Analítica NLP
            </h1>
            <p class="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
              Motor de Generación de Agregaciones MongoDB en Tiempo Real
            </p>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="toggleChatPanel()"
                    class="px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-black uppercase tracking-widest transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline mr-1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> {{ showChatPanel() ? 'Ocultar Chat' : 'Chat Analista IA' }}
            </button>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
              <span class="w-2 h-2 rounded-full animate-pulse"
                    [class.bg-emerald-400]="isAiServiceOnline()"
                    [class.bg-red-500]="!isAiServiceOnline()"></span>
              Llama-3 & Groq Activo
            </div>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-8 items-start">
          
          <!-- LEFT PANEL (existing dashboard view) -->
          <div [class]="showChatPanel() ? 'col-span-8 space-y-10' : 'col-span-12 space-y-10'">
            <!-- OMNIBAR / SPOTLIGHT SEARCH -->
            <section class="flex flex-col items-center gap-4">
              <div class="relative w-full max-w-2xl group transition-all duration-500">
                <!-- Glow detrás de la barra al enfocar -->
                <div class="absolute -inset-1.5 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                
                <div class="relative flex items-center bg-slate-900/60 backdrop-blur-3xl border border-slate-800 rounded-2xl px-6 py-4 shadow-2xl transition-all duration-300 group-hover:border-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400 mr-4 opacity-80">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  
                  <input 
                    #searchInput
                    type="text" 
                    [(ngModel)]="searchQuery" 
                    (keydown.enter)="ejecutarConsulta()"
                    placeholder="Pregunta algo sobre tus datos (ej: Cantidad de trámites por estado)..." 
                    class="bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-500 w-full text-base font-semibold outline-none focus:outline-none"
                  />
                  
                  <div class="flex items-center gap-3 ml-4">
                    <kbd class="hidden sm:inline-flex px-2 py-1 rounded bg-white/5 border border-slate-800 text-[10px] font-mono text-slate-400 items-center gap-1 select-none">
                      <span class="text-xs">Ctrl</span>K
                    </kbd>
                    <!-- Botón de Micrófono para Búsqueda por Voz -->
                    <button 
                      (click)="toggleVoiceSearch()" 
                      [class]="isRecording() ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-slate-800/50'"
                      class="p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                      [title]="isRecording() ? 'Detener grabación' : 'Buscar por voz (Whisper)'"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                        <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                        <line x1="12" x2="12" y1="19" y2="22"/>
                      </svg>
                    </button>
                    <button 
                      (click)="ejecutarConsulta()" 
                      [disabled]="loading() || !searchQuery.trim()"
                      class="px-4 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-1"
                    >
                      @if (loading()) {
                        <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      } @else {
                        <span>Buscar</span>
                      }
                    </button>
                  </div>
                </div>
              </div>

              <!-- Sugerencias de Consultas -->
              <div class="flex flex-wrap justify-center gap-2 max-w-3xl mt-1">
                <span class="text-xs text-slate-500 font-bold self-center mr-1">Sugerencias:</span>
                @for (sug of sugerencias; track sug) {
                  <button 
                    (click)="seleccionarSugerencia(sug)"
                    class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-800/50 text-[11px] font-bold text-slate-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {{ sug }}
                  </button>
                }
              </div>
            </section>

            <!-- PANEL DE FILTROS Y EXPORTACIÓN -->
            <section class="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl transition-all hover:border-slate-800 max-w-5xl mx-auto">
              <div class="flex justify-between items-center mb-4 border-b border-slate-800/50 pb-3">
                <h3 class="text-sm font-black text-slate-100 tracking-wider flex items-center gap-2 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  Parámetros de Reporte Dinámico
                </h3>
                <span class="text-[10px] text-slate-500 font-bold">Aislamiento Multitenant Forzado</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <!-- 1. Datos / Colección -->
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest">1. Datos (Colección)</label>
                  <select 
                    [(ngModel)]="selectedCollection"
                    class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                  >
                    <option value="tramites">Trámites (tramites)</option>
                    <option value="registros_actividad">Actividades (registros_actividad)</option>
                    <option value="clientes">Clientes (clientes)</option>
                    <option value="departamentos">Departamentos (departamentos)</option>
                  </select>
                </div>

                <!-- 2. Filtro por Política -->
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest">2. Filtrar por Proceso</label>
                  <select 
                    [(ngModel)]="selectedPoliticaId"
                    class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Todas las Políticas</option>
                    @for (p of politicasList(); track p.id) {
                      <option [value]="p.id">{{ p.nombre }}</option>
                    }
                  </select>
                </div>

                <!-- 3. Criterios de Ordenamiento -->
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest">3. Ordenar por</label>
                  <div class="flex gap-1">
                    <select 
                      [(ngModel)]="orderByField"
                      class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                    >
                      <option value="">(Sin orden específico)</option>
                      <option value="iniciadoEn">Fecha de Inicio (iniciadoEn)</option>
                      <option value="estado">Estado</option>
                      @for (key of availableKeys(); track key) {
                        <option [value]="key">{{ key }}</option>
                      }
                    </select>
                    <select 
                      [(ngModel)]="orderByDirection"
                      class="bg-slate-800 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                    >
                      <option value="1">ASC</option>
                      <option value="-1">DESC</option>
                    </select>
                  </div>
                </div>

                <!-- 4. Límite y Formato -->
                <div class="space-y-1.5">
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-widest">4. Límite de Registros</label>
                  <input 
                    type="number" 
                    [(ngModel)]="recordsLimit"
                    class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>

              <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-slate-800/50">
                <div class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  La consulta validará que existan registros reales en MongoDB para evitar alucinaciones.
                </div>

                <div class="flex items-center gap-3 w-full sm:w-auto">
                  <!-- Selector de Formato de Exportación -->
                  <div class="flex items-center bg-white/5 rounded-xl border border-slate-800/50 p-0.5">
                    @for (fmt of ['pdf', 'xlsx', 'docx']; track fmt) {
                      <button 
                        (click)="exportFormat = fmt"
                        [class]="exportFormat === fmt ? 'bg-indigo-600 text-white font-black' : 'text-slate-400 hover:text-slate-200'"
                        class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        {{ fmt }}
                      </button>
                    }
                  </div>

                  <!-- Botones de Exportación -->
                  <button 
                    (click)="exportarReporte(false, false)"
                    [disabled]="exporting() || loading()"
                    class="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 shadow-lg"
                  >
                    @if (exporting() && !exportingChart()) {
                      <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Exportando Datos...</span>
                    } @else {
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>Descargar Datos Crudos</span>
                    }
                  </button>
                </div>
              </div>
            </section>

            <!-- ERROR STATE -->
            @if (error()) {
              <div class="p-6 rounded-3xl border border-red-500/20 bg-red-500/5 backdrop-blur-xl flex gap-4 items-start animate-in fade-in duration-300">
                <div class="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <h3 class="font-bold text-red-400">Error en el análisis semántico</h3>
                  <p class="text-slate-400 text-sm mt-1 leading-relaxed">{{ error() }}</p>
                </div>
              </div>
            }

            <!-- INITIAL STATE (No query run yet) -->
            @if (!hasSearched() && !loading()) {
              <div class="p-16 rounded-[2.5rem] border border-slate-800/50 bg-slate-900/40 backdrop-blur-md text-center max-w-2xl mx-auto space-y-6">
                <div class="w-20 h-20 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-pulse"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                </div>
                <div class="space-y-2">
                  <h3 class="text-xl font-bold text-slate-100">Consulte en Lenguaje Natural</h3>
                  <p class="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                    Nuestra Inteligencia Artificial traducirá su consulta a un pipeline de agregación seguro de MongoDB, procesando la información del tenant de forma privada.
                  </p>
                </div>
              </div>
            }

            <!-- LOADING STATE SKELETONS -->
            @if (loading()) {
              <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div class="md:col-span-8 h-96 bg-white/[0.01] rounded-3xl border border-slate-800/50 animate-pulse"></div>
                <div class="md:col-span-4 h-96 bg-white/[0.01] rounded-3xl border border-slate-800/50 animate-pulse"></div>
                <div class="md:col-span-4 h-32 bg-white/[0.01] rounded-3xl border border-slate-800/50 animate-pulse"></div>
                <div class="md:col-span-4 h-32 bg-white/[0.01] rounded-3xl border border-slate-800/50 animate-pulse"></div>
                <div class="md:col-span-4 h-32 bg-white/[0.01] rounded-3xl border border-slate-800/50 animate-pulse"></div>
              </div>
            }

            <!-- DATA RESULTS & GRID -->
            @if (hasSearched() && !loading() && !error()) {
              
              <!-- KPIs de la Agregación -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <!-- KPI Colección -->
                <div class="p-6 rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-md shadow-xl flex items-center gap-4 relative overflow-hidden group">
                  <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/[0.01] group-hover:scale-150 transition-all duration-700"></div>
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Colección Destino</p>
                    <p class="text-lg font-black text-slate-100 mt-0.5">{{ collection() }}</p>
                  </div>
                </div>

                <!-- KPI Documentos -->
                <div class="p-6 rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-md shadow-xl flex items-center gap-4 relative overflow-hidden group">
                  <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/[0.01] group-hover:scale-150 transition-all duration-700"></div>
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  </div>
                  <div>
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resultados Obtenidos</p>
                    <p class="text-lg font-black text-slate-100 mt-0.5">{{ queryResults().length }} registros</p>
                  </div>
                </div>

                <!-- KPI Aislamiento Tenant -->
                <div class="p-6 rounded-3xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-md shadow-xl flex items-center gap-4 relative overflow-hidden group">
                  <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/[0.01] group-hover:scale-150 transition-all duration-700"></div>
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div>
                    <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aislamiento Multitenant</p>
                    <p class="text-lg font-black text-emerald-400 mt-0.5">Filtro Forzado</p>
                  </div>
                </div>
              </div>

              <!-- Bento Grid de Visualización y Pipeline -->
              <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                <!-- CARD 1: CHART VISUALIZATION (colspan 8) -->
                <div class="md:col-span-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col relative overflow-hidden transition-all hover:border-slate-800">
                  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 class="text-xl font-bold text-slate-100 tracking-tight">Gráfico de Resultados</h3>
                      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Renderizado Dinámico con Apache ECharts</p>
                    </div>
                    
                    <!-- Controles de Mapeo del Gráfico y Exportar Gráfico -->
                    @if (queryResults().length > 0) {
                      <div class="flex flex-wrap items-center gap-2">
                        <!-- Selector de tipo de gráfico -->
                        <div class="flex items-center bg-white/5 rounded-xl border border-slate-800/50 p-0.5">
                          @for (type of ['bar', 'line', 'pie', 'doughnut']; track type) {
                            <button 
                              (click)="cambiarTipoGrafico(type)"
                              [class]="selectedChartType() === type ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
                              class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                            >
                              {{ type }}
                            </button>
                          }
                        </div>
                        
                        <!-- Boton de Exportar NLP / Gráfico -->
                        <button 
                          (click)="exportarReporte(true, true)"
                          [disabled]="exporting() || loading()"
                          class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 ml-2"
                        >
                          @if (exporting() && exportingChart()) {
                            <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Generando...</span>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                            <span>Descargar Gráfico</span>
                          }
                        </button>
                      </div>
                    }
                  </div>

                  <!-- CONTROLES EXTRA DE MAPEO (Dropdowns para seleccionar X e Y) -->
                  @if (queryResults().length > 0) {
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-white/[0.02] border border-slate-800/50 rounded-2xl">
                      <div>
                        <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Categoría (Eje X / Eje Leyenda)</label>
                        <select 
                          [(ngModel)]="tempLabelKey"
                          (change)="actualizarMapeo()"
                          class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                        >
                          @for (key of availableKeys(); track key) {
                            <option [value]="key">{{ key }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Métrica (Eje Y / Valores)</label>
                        <select 
                          [(ngModel)]="tempValueKey"
                          (change)="actualizarMapeo()"
                          class="w-full bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                        >
                          @for (key of availableKeys(); track key) {
                            <option [value]="key">{{ key }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  }

                  <!-- Contenedor ECharts -->
                  <div class="flex-grow min-h-[320px] w-full relative">
                    @if (queryResults().length === 0) {
                      <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-white/[0.01] rounded-2xl border border-dashed border-slate-800/50 p-10 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600 mb-2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
                        <p class="font-bold text-sm">Consulta exitosa, pero no se devolvieron registros.</p>
                        <p class="text-xs text-slate-600 mt-1 max-w-xs leading-normal">
                          Es posible que no existan documentos que coincidan con los filtros aplicados en el pipeline.
                        </p>
                      </div>
                    } @else if (chartOptions()) {
                      <div echarts [options]="chartOptions()!" (chartInit)="onChartInit($event)" class="w-full h-full min-h-[320px]"></div>
                    }
                  </div>
                </div>

                <!-- CARD 2: MONGO PIPELINE INSPECTOR (colspan 4) -->
                <div class="md:col-span-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col relative overflow-hidden transition-all hover:border-slate-800">
                  <div class="flex justify-between items-center mb-6">
                    <div>
                      <h3 class="text-lg font-bold text-slate-100 tracking-tight">Pipeline Generado</h3>
                      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">MongoDB Aggregation Framework</p>
                    </div>
                    <button 
                      (click)="copiarPipeline()" 
                      class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-slate-800/50 relative"
                      title="Copiar Pipeline"
                    >
                      @if (copied()) {
                        <span class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded shadow-xl">Copiado</span>
                      }
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                  </div>

                  <!-- Pipeline codeblock -->
                  <div class="flex-grow overflow-hidden flex flex-col">
                    <div class="w-full flex-grow bg-slate-950 rounded-2xl border border-slate-800/50 p-4 overflow-y-auto max-h-[380px] custom-scrollbar font-mono text-[10px] text-indigo-300 leading-relaxed">
                      <pre class="whitespace-pre-wrap select-all text-slate-100">{{ pipelineJson() }}</pre>
                    </div>
                  </div>
                  
                  <div class="mt-4 pt-4 border-t border-slate-800/50 text-[9px] text-slate-500 leading-relaxed flex gap-2 items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400 shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>El pipeline se ejecuta dentro de un sandbox seguro: no se permiten operadores destructivos ($out, $merge) ni modificaciones de escritura.</span>
                  </div>
                </div>

                <!-- CARD 3: RAW RESULTS TABLE (colspan 12) -->
                <div class="md:col-span-12 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl transition-all hover:border-slate-800">
                  <div class="flex justify-between items-center mb-6">
                    <div>
                      <h3 class="text-xl font-bold text-slate-100 tracking-tight">Tabla de Resultados</h3>
                      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Registros crudos obtenidos de la agregación</p>
                    </div>
                    <button 
                      (click)="descargarJSON()"
                      class="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-800/50 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Exportar JSON
                    </button>
                  </div>

                  <!-- Table viewport -->
                  @if (queryResults().length === 0) {
                    <div class="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs bg-white/[0.01] border border-dashed border-slate-800/50 rounded-2xl">
                      Sin registros que mostrar
                    </div>
                  } @else {
                    <div class="overflow-x-auto rounded-2xl border border-slate-800/50 bg-slate-950/50">
                      <table class="w-full border-collapse text-left">
                        <thead>
                          <tr class="bg-white/[0.02] border-b border-slate-800/50 text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <th class="px-6 py-4">Fila</th>
                            @for (key of availableKeys(); track key) {
                              <th class="px-6 py-4">{{ key }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/50 text-xs font-semibold text-slate-300">
                          @for (row of queryResults(); track $index) {
                            <tr class="hover:bg-white/[0.01] transition-colors">
                              <td class="px-6 py-4 font-mono text-[10px] text-slate-600">#{{ $index + 1 }}</td>
                              @for (key of availableKeys(); track key) {
                                <td class="px-6 py-4 truncate max-w-[220px]" [title]="formatValue(row[key])">
                                  {{ formatValue(row[key]) }}
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>

              </div>
            }
          </div>

          <!-- RIGHT PANEL (COLLAPSIBLE CHAT DRAWER) -->
          @if (showChatPanel()) {
            <div class="col-span-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl sticky top-6 flex flex-col h-[650px] overflow-hidden animate-in slide-in-from-right duration-300">
              <div class="flex justify-between items-center pb-3 border-b border-slate-800/50 mb-4 flex-shrink-0">
                <h3 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                   <span>Asistente Analítico IA</span>
                </h3>
                <button (click)="clearChat()" class="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase">Limpiar</button>
              </div>

              <!-- Chat messages feed -->
              <div class="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4 flex flex-col">
                @for (msg of chatMessages(); track $index) {
                  <div class="max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed"
                       [class]="msg.sender === 'user' ? 'bg-indigo-600 text-white self-end rounded-tr-none' : 'bg-white/5 border border-slate-800/50 text-slate-300 self-start rounded-tl-none'">
                     <p class="font-bold mb-1 opacity-60 text-[9px] uppercase">{{ msg.sender === 'user' ? 'Gerente' : 'Analista IA' }}</p>
                     <p class="whitespace-pre-wrap">{{ msg.text }}</p>
                  </div>
                } @empty {
                  <div class="flex-grow flex flex-col items-center justify-center text-center text-slate-500 p-8 space-y-4">
                     <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-indigo-400/80 animate-pulse"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                     <p class="text-xs font-bold text-slate-400">¿En qué puedo ayudarte hoy?</p>
                     <p class="text-[10px] text-slate-600 leading-normal">Puedes preguntarme cosas como: "Muestra los trámites de este mes" y luego pedirme: "Ahora fíltralos por los del departamento Técnico" en forma de conversación.</p>
                  </div>
                }
              </div>

              <!-- Input Box -->
              <div class="relative flex items-center bg-slate-800 border border-slate-800 rounded-2xl px-4 py-3 flex-shrink-0">
                 <input type="text" 
                        [(ngModel)]="chatInputText"
                        (keydown.enter)="sendChatMessage()"
                        placeholder="Escribe tu consulta..."
                        class="bg-transparent border-none focus:ring-0 text-slate-100 placeholder:text-slate-600 w-full text-xs font-semibold outline-none focus:outline-none"
                 />
                 <button (click)="sendChatMessage()" [disabled]="!chatInputText.trim()"
                         class="ml-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                 </button>
              </div>
            </div>
          }

        </div>

      </main>

    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.2);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.4);
    }
  `]
})
export class NlpAnalyticsDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private mlService = inject(MlAnalysisService);
  private authService = inject(AuthService);
  private aiAssistant = inject(AiAssistantService);
  private politicaService = inject(PoliticaService);

  searchQuery = '';
  loading = signal(false);
  error = signal<string | null>(null);
  hasSearched = signal(false);
  copied = signal(false);

  showChatPanel = signal<boolean>(false);
  chatInputText = '';
  chatMessages = signal<{ sender: 'user' | 'ai'; text: string; time: Date }[]>([]);

  isAiServiceOnline = signal<boolean>(true);
  private healthPoller: any = null;
  private themeObserver: any = null;

  verificarEstadoAI() {
    this.mlService.checkAiHealth().subscribe({
      next: (res) => {
        this.isAiServiceOnline.set(res?.status === 'running');
      },
      error: (err) => {
        this.isAiServiceOnline.set(false);
      }
    });
  }

  toggleChatPanel() {
    this.showChatPanel.update(v => !v);
  }

  clearChat() {
    this.chatMessages.set([]);
  }

  sendChatMessage() {
    const prompt = this.chatInputText.trim();
    if (!prompt) return;

    this.chatInputText = '';
    this.chatMessages.update(msgs => [...msgs, { sender: 'user', text: prompt, time: new Date() }]);

    this.loading.set(true);
    this.error.set(null);
    this.hasSearched.set(true);
    this.searchQuery = prompt;

    const tenantId = this.authService.usuario()?.tenantId || undefined;

    const history = this.chatMessages().slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    this.mlService.nlToAggregation(prompt, tenantId, this.selectedPoliticaId || undefined, history).subscribe({
      next: (res) => {
        this.collection.set(res.collection || '');
        this.pipeline.set(res.pipeline || []);
        this.queryResults.set(res.results || []);
        this.autoMapFields();

        const aiText = `He generado el pipeline de agregación para la colección **${res.collection}** con ${res.pipeline?.length || 0} etapas y he obtenido ${res.results?.length || 0} resultados.\n\nPuedes ver el gráfico y la tabla actualizados a la izquierda.`;

        this.chatMessages.update(msgs => [...msgs, { sender: 'ai', text: aiText, time: new Date() }]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error en chat NLP:', err);
        const errDetail = err.error?.detail || err.message || 'Error desconocido';
        this.error.set(errDetail);

        const aiErrorText = `Lo siento, ocurrió un error al procesar tu consulta:\n${errDetail}`;
        this.chatMessages.update(msgs => [...msgs, { sender: 'ai', text: aiErrorText, time: new Date() }]);
        this.loading.set(false);
      }
    });
  }

  // Recording & exporting state
  isRecording = signal(false);
  exporting = signal(false);
  exportingChart = signal(false);
  echartsInstance: any = null;
  selectedCollection = 'tramites';
  selectedPoliticaId = '';
  orderByField = '';
  orderByDirection = '1';
  recordsLimit = 50;
  exportFormat = 'pdf';
  politicasList = signal<PoliticaDTO[]>([]);

  // Results & mapping signals
  queryResults = signal<any[]>([]);
  collection = signal<string>('');
  pipeline = signal<any[]>([]);
  availableKeys = signal<string[]>([]);

  selectedLabelKey = signal<string>('');
  selectedValueKey = signal<string>('');
  selectedChartType = signal<string>('bar');

  // Temp binding keys for mapping selects
  tempLabelKey = '';
  tempValueKey = '';

  // Options for ECharts
  chartOptions = signal<EChartsOption | null>(null);

  sugerencias = [
    'Cantidad de trámites por estado',
    'Ejecuciones de actividades por departamento',
    'Promedio de duración de trámites por estado',
    'Clientes agrupados por correo electrónico',
    'Listado de departamentos con presupuesto anual'
  ];

  ngOnInit() {
    setTimeout(() => {
      this.focusSearch();
    }, 500);

    if (typeof window !== 'undefined') {
      const observer = new MutationObserver(() => {
        this.renderChart();
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      this.themeObserver = observer;
    }

    const tenantId = this.authService.usuario()?.tenantId;
    if (tenantId) {
      this.politicaService.listarPorTenant(tenantId).subscribe({
        next: (data) => this.politicasList.set(data),
        error: (err) => console.error('Error cargando políticas:', err)
      });
    }

    this.verificarEstadoAI();
    this.healthPoller = setInterval(() => {
      this.verificarEstadoAI();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.healthPoller) {
      clearInterval(this.healthPoller);
    }
    if (this.themeObserver) {
      this.themeObserver.disconnect();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
    }
  }

  focusSearch() {
    if (this.searchInput) {
      this.searchInput.nativeElement.focus();
    }
  }

  seleccionarSugerencia(sug: string) {
    this.searchQuery = sug;
    this.ejecutarConsulta();
  }

  ejecutarConsulta() {
    const queryStr = this.searchQuery.trim();
    if (!queryStr) return;

    this.loading.set(true);
    this.error.set(null);
    this.hasSearched.set(true);

    const tenantId = this.authService.usuario()?.tenantId || undefined;

    this.mlService.nlToAggregation(queryStr, tenantId, this.selectedPoliticaId || undefined).subscribe({
      next: (res) => {
        this.collection.set(res.collection || '');
        this.pipeline.set(res.pipeline || []);
        this.queryResults.set(res.results || []);

        this.autoMapFields();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error en consulta NLP a agregación:', err);
        this.error.set(err.error?.detail || err.message || 'Error desconocido al procesar la consulta.');
        this.loading.set(false);
      }
    });
  }

  autoMapFields() {
    const results = this.queryResults();
    if (!results || results.length === 0) {
      this.availableKeys.set([]);
      this.chartOptions.set(null);
      return;
    }

    const first = results[0];
    const keys = Object.keys(first);
    this.availableKeys.set(keys);

    // Encontrar la clave categórica (Labels) y la métrica (Values)
    let labelK = '';
    let valueK = '';

    // Buscar _id primero para la categoría
    if (keys.includes('_id')) {
      labelK = '_id';
    }

    // Buscar un campo numérico para la métrica
    for (const key of keys) {
      if (key === '_id') continue;
      const val = first[key];
      if (typeof val === 'number') {
        valueK = key;
        break;
      }
    }

    // Fallbacks si no se autodetectó
    if (!labelK) {
      labelK = keys.find(k => k !== valueK) || keys[0];
    }
    if (!valueK) {
      valueK = keys.find(k => k !== labelK && typeof first[k] === 'number') || keys.find(k => k !== labelK) || keys[0];
    }

    this.selectedLabelKey.set(labelK);
    this.selectedValueKey.set(valueK);

    // Asignar variables temporales para los dropdowns
    this.tempLabelKey = labelK;
    this.tempValueKey = valueK;

    this.renderChart();
  }

  actualizarMapeo() {
    this.selectedLabelKey.set(this.tempLabelKey);
    this.selectedValueKey.set(this.tempValueKey);
    this.renderChart();
  }

  cambiarTipoGrafico(type: string) {
    this.selectedChartType.set(type);
    this.renderChart();
  }

  renderChart() {
    const results = this.queryResults();
    if (!results || results.length === 0) {
      this.chartOptions.set(null);
      return;
    }

    const labelK = this.selectedLabelKey();
    const valueK = this.selectedValueKey();
    const chartType = this.selectedChartType();

    // Mapear arrays de categorías y valores
    const categories = results.map(r => {
      const val = r[labelK];
      if (val === null || val === undefined) return 'N/A';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });

    const values = results.map(r => Number(r[valueK] || 0));

    // Theme adaptations
    const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
    const labelColor = isLight ? '#475569' : '#cbd5e1';
    const subLabelColor = isLight ? '#64748b' : '#94a3b8';
    const gridColor = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.05)';
    const axisColor = isLight ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.1)';
    const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.9)';
    const tooltipBorder = isLight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    const tooltipText = isLight ? '#0f172a' : '#f8fafc';
    const pieBorderColor = isLight ? '#f8fafc' : '#131314';

    let option: EChartsOption = {};

    const colorPalette = ['#3b82f6', '#22d3ee', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];

    if (chartType === 'pie' || chartType === 'doughnut') {
      const pieData = results.map((r, i) => ({
        name: categories[i],
        value: values[i]
      }));

      option = {
        color: colorPalette,
        tooltip: {
          trigger: 'item',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: tooltipText },
          formatter: '{b}: <span class="font-bold text-slate-100">{c}</span> ({d}%)'
        },
        legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20,
          textStyle: { color: labelColor, fontSize: 10 }
        },
        series: [
          {
            name: valueK,
            type: 'pie',
            radius: chartType === 'doughnut' ? ['40%', '70%'] : '70%',
            center: ['40%', '50%'],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 8,
              borderColor: pieBorderColor,
              borderWidth: 2
            },
            label: {
              show: false
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 12,
                fontWeight: 'bold',
                color: labelColor
              }
            },
            data: pieData
          }
        ]
      };
    } else {
      // Bar o Line chart
      option = {
        color: colorPalette,
        tooltip: {
          trigger: 'axis',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: tooltipText },
          axisPointer: { type: 'shadow' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '8%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: {
            color: subLabelColor,
            rotate: categories.length > 8 ? 30 : 0,
            fontSize: 10
          },
          axisLine: { lineStyle: { color: axisColor } }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: subLabelColor, fontSize: 10 }
        },
        series: [
          {
            name: valueK,
            type: chartType as 'bar' | 'line',
            data: values,
            smooth: true,
            barMaxWidth: 36,
            itemStyle: {
              borderRadius: chartType === 'bar' ? [6, 6, 0, 0] : 0,
              color: chartType === 'line' ? '#22d3ee' : '#3b82f6'
            },
            areaStyle: chartType === 'line' ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(34, 211, 238, 0.25)' },
                  { offset: 1, color: 'rgba(34, 211, 238, 0)' }
                ]
              }
            } : undefined
          }
        ]
      };
    }

    this.chartOptions.set(option);
  }

  onChartInit(ec: any) {
    this.echartsInstance = ec;
  }

  formatValue(val: any): string {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  }

  pipelineJson(): string {
    return JSON.stringify(this.pipeline(), null, 2);
  }

  copiarPipeline() {
    const jsonStr = this.pipelineJson();
    navigator.clipboard.writeText(jsonStr).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  descargarJSON() {
    const jsonStr = JSON.stringify(this.queryResults(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nlp-report-${this.collection()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  toggleVoiceSearch() {
    if (this.isRecording()) {
      this.aiAssistant.detenerEscucha();
      this.isRecording.set(false);
      return;
    }

    this.isRecording.set(true);
    this.error.set(null);
    this.aiAssistant.empezarAEscuchar(
      (text, isFinal) => {
        this.searchQuery = text;
        if (isFinal) {
          this.isRecording.set(false);
          this.ejecutarConsulta();
        }
      },
      (err) => {
        console.error('Error de grabación por voz:', err);
        this.isRecording.set(false);
        this.error.set('Error en el reconocimiento de voz: ' + String(err));
      },
      () => {
        this.isRecording.set(false);
      }
    );
  }

  exportarReporte(withChart: boolean = false, fromGraphicPanel: boolean = true) {
    const queryStr = fromGraphicPanel ? this.searchQuery.trim() : '';
    this.exporting.set(true);
    this.exportingChart.set(withChart);
    this.error.set(null);

    const tenantId = this.authService.usuario()?.tenantId || undefined;
    let pipeline = undefined;

    if (fromGraphicPanel && this.hasSearched() && this.pipeline().length > 0) {
      pipeline = this.pipeline();
    } else {
      const matchStage: any = {};
      if (tenantId) matchStage.tenantId = tenantId;
      if (this.selectedPoliticaId) matchStage.politicaId = this.selectedPoliticaId;

      const stages: any[] = [{ $match: matchStage }];

      if (this.orderByField && this.orderByField.trim()) {
        const sortStage: any = {};
        sortStage[this.orderByField.trim()] = Number(this.orderByDirection);
        stages.push({ $sort: sortStage });
      }

      if (this.recordsLimit > 0) {
        stages.push({ $limit: this.recordsLimit });
      }

      pipeline = stages;
    }

    let chartImage = undefined;
    if (withChart && this.echartsInstance && fromGraphicPanel) {
      chartImage = this.echartsInstance.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: document.documentElement.classList.contains('theme-light') ? '#f8fafc' : '#020617'
      });
    }

    const payload = {
      query: (fromGraphicPanel && queryStr) ? queryStr : undefined,
      collection: this.collection() || this.selectedCollection,
      pipeline: pipeline,
      tenantId: tenantId,
      politicaId: this.selectedPoliticaId || undefined,
      format: this.exportFormat,
      chartImage: chartImage
    };

    this.mlService.exportReport(payload).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${this.selectedCollection}-${Date.now()}.${this.exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.exportingChart.set(false);
      },
      error: (err) => {
        console.error('Error al exportar reporte:', err);
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorObj = JSON.parse(reader.result as string);
            this.error.set(errorObj.detail || 'Error al generar el reporte.');
          } catch (e) {
            this.error.set('No se encontraron registros para los filtros seleccionados o el servidor falló.');
          }
          this.exporting.set(false);
          this.exportingChart.set(false);
        };
        reader.readAsText(err.error || err);
      }
    });
  }
}

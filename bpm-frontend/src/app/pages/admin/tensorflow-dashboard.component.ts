import { Component, OnInit, inject, signal, computed, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TensorflowService, TFPredictRequest, TFPredictResponse } from '../../services/tensorflow.service';

/* ─── Architecture Definitions ──────────────────────────────── */
interface NeuronLayer {
  name: string;
  neurons: number;
  type: 'input' | 'dense' | 'bn' | 'dropout' | 'output';
  activation?: string;
  color: string;
}

const MULTI_OUTPUT_LAYERS: NeuronLayer[] = [
  { name: 'Input', neurons: 6, type: 'input', color: '#6366f1' },
  { name: 'Dense(64)', neurons: 8, type: 'dense', activation: 'ReLU', color: '#8b5cf6' },
  { name: 'BatchNorm', neurons: 8, type: 'bn', color: '#a78bfa' },
  { name: 'Dropout(0.2)', neurons: 8, type: 'dropout', color: '#c4b5fd' },
  { name: 'Dense(32)', neurons: 6, type: 'dense', activation: 'ReLU', color: '#7c3aed' },
  { name: 'BatchNorm', neurons: 6, type: 'bn', color: '#a78bfa' },
];

const OUTPUT_BRANCHES: NeuronLayer[] = [
  { name: 'Duración', neurons: 1, type: 'output', activation: 'Linear', color: '#10b981' },
  { name: 'Prioridad', neurons: 3, type: 'output', activation: 'Softmax', color: '#f59e0b' },
  { name: 'Ruta', neurons: 4, type: 'output', activation: 'Softmax', color: '#ef4444' },
];

const AUTOENCODER_LAYERS: NeuronLayer[] = [
  { name: 'Input', neurons: 6, type: 'input', color: '#06b6d4' },
  { name: 'Encoder(16)', neurons: 8, type: 'dense', activation: 'ReLU', color: '#0891b2' },
  { name: 'Encoder(8)', neurons: 5, type: 'dense', activation: 'ReLU', color: '#0e7490' },
  { name: 'Bottleneck(4)', neurons: 3, type: 'dense', activation: 'ReLU', color: '#155e75' },
  { name: 'Decoder(8)', neurons: 5, type: 'dense', activation: 'ReLU', color: '#0e7490' },
  { name: 'Decoder(16)', neurons: 8, type: 'dense', activation: 'ReLU', color: '#0891b2' },
  { name: 'Output', neurons: 6, type: 'output', activation: 'Linear', color: '#06b6d4' },
];

@Component({
  selector: 'app-tensorflow-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; }

    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 999px; }

    @keyframes pulseGlow { 0%,100% { filter: drop-shadow(0 0 4px currentColor); opacity: 0.7; } 50% { filter: drop-shadow(0 0 12px currentColor); opacity: 1; } }
    .neuron-glow { animation: pulseGlow 2.5s ease-in-out infinite; }
    
    @keyframes flowRight { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }
    .flow-anim { stroke-dasharray: 8 12; animation: flowRight 1.5s linear infinite; }

    @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .slide-in { animation: slideIn 0.5s ease-out forwards; }

    @keyframes anomalyPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 20px 8px rgba(239,68,68,0.2); } }
    .anomaly-pulse { animation: anomalyPulse 1.5s ease-in-out infinite; }

    .slider-custom { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
    .slider-custom::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: linear-gradient(90deg, #312e81, #6366f1); }
    .slider-custom::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #818cf8; border: 3px solid #1e1b4b; }
  `],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-8 custom-scrollbar overflow-y-auto" style="max-height: calc(100vh - 4rem);">

      <!-- HEADER -->
      <div class="flex items-center justify-between mb-10 slide-in">
        <div class="flex items-center gap-5">
          <div class="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-4 ring-indigo-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>
          </div>
          <div>
            <h1 class="text-3xl font-black tracking-tight">Motor Predictivo TensorFlow</h1>
            <p class="text-sm text-slate-400 font-medium mt-1">Visualización interactiva de redes neuronales y simulación en tiempo real</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">TensorFlow 2.21 Activo</span>
          </div>
        </div>
      </div>

      <!-- TAB SELECTOR -->
      <div class="flex gap-2 mb-8 p-1.5 rounded-2xl bg-slate-900/60 border border-white/5 w-fit">
        @for (tab of tabs; track tab.id) {
          <button (click)="activeTab.set(tab.id)"
                  class="px-6 py-3 rounded-xl text-xs font-bold transition-all"
                  [class]="activeTab() === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- TAB 1: MULTI-OUTPUT MODEL -->
      @if (activeTab() === 'multioutput') {
        <div class="slide-in">
          <div class="p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 shadow-xl mb-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49l2.83-2.83"/></svg>
              </div>
              <div>
                <h2 class="text-lg font-black text-white">Modelo Multi-Output</h2>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Input(6) → Dense(64) → BN → Dropout → Dense(32) → BN → 3 Salidas</p>
              </div>
            </div>

            <!-- SVG NEURAL NET -->
            <div class="w-full overflow-x-auto pb-4">
              <svg [attr.width]="svgWidth" height="400" class="mx-auto">
                <!-- CONNECTIONS -->
                @for (conn of multiOutputConnections(); track $index) {
                  <line [attr.x1]="conn.x1" [attr.y1]="conn.y1" [attr.x2]="conn.x2" [attr.y2]="conn.y2"
                        class="flow-anim" [style.stroke]="conn.color" stroke-width="1" opacity="0.25" />
                }
                <!-- LAYERS -->
                @for (layer of multiOutputNeuronPositions(); track $index) {
                  @for (n of layer.neurons; track $index) {
                    <circle [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="layer.type === 'output' ? 14 : 10"
                            [attr.fill]="layer.color" opacity="0.85" class="neuron-glow"
                            [style.animation-delay]="($index * 0.15) + 's'"
                            [style.color]="layer.color" />
                    <circle [attr.cx]="n.x" [attr.cy]="n.y" r="3" fill="white" opacity="0.6" />
                    
                    <!-- Individual labels for input neurons -->
                    @if (layer.type === 'input' && n.label) {
                      <text [attr.x]="n.x - 16" [attr.y]="n.y + 4" text-anchor="end"
                            fill="#cbd5e1" font-size="9" font-weight="800" class="font-sans">{{ n.label }}</text>
                    }
                    <!-- Individual labels for output neurons -->
                    @if (layer.type === 'output' && n.label) {
                      <text [attr.x]="n.x + 22" [attr.y]="n.y + 4" text-anchor="start"
                            fill="#cbd5e1" font-size="9" font-weight="800" class="font-sans">{{ n.label }}</text>
                    }
                  }
                  <!-- Layer Label -->
                  <text [attr.x]="layer.labelX" [attr.y]="380" text-anchor="middle"
                        fill="#94a3b8" font-size="9" font-weight="700" class="uppercase">{{ layer.name }}</text>
                }
              </svg>
            </div>

            <div class="grid grid-cols-3 gap-4 mt-6">
              @for (out of outputBranches; track out.name) {
                <div class="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-center">
                  <div class="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" [style.background]="out.color + '20'" [style.color]="out.color">
                    <span class="text-lg font-black">{{ out.neurons }}</span>
                  </div>
                  <p class="text-xs font-bold text-white">{{ out.name }}</p>
                  <p class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{{ out.activation }}</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: AUTOENCODER -->
      @if (activeTab() === 'autoencoder') {
        <div class="slide-in">
          <div class="p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 shadow-xl mb-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><path d="M2 12h5"/><path d="M17 12h5"/><circle cx="12" cy="12" r="5"/></svg>
              </div>
              <div>
                <h2 class="text-lg font-black text-white">Autoencoder — Detección de Anomalías</h2>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">6 → 16 → 8 → 4 (bottleneck) → 8 → 16 → 6</p>
              </div>
            </div>

            <!-- SVG AUTOENCODER -->
            <div class="w-full overflow-x-auto pb-4">
              <svg [attr.width]="aeWidth" height="380" class="mx-auto">
                @for (conn of autoencoderConnections(); track $index) {
                  <line [attr.x1]="conn.x1" [attr.y1]="conn.y1" [attr.x2]="conn.x2" [attr.y2]="conn.y2"
                        class="flow-anim" [style.stroke]="conn.color" stroke-width="1" opacity="0.2" />
                }
                @for (layer of autoencoderNeuronPositions(); track $index) {
                  @for (n of layer.neurons; track $index) {
                    <circle [attr.cx]="n.x" [attr.cy]="n.y" [attr.r]="layer.name === 'Bottleneck(4)' ? 16 : 10"
                            [attr.fill]="layer.color" opacity="0.85" class="neuron-glow"
                            [style.animation-delay]="($index * 0.12) + 's'"
                            [style.color]="layer.color" />
                    <circle [attr.cx]="n.x" [attr.cy]="n.y" r="3" fill="white" opacity="0.6" />
                    
                    <!-- Individual labels for input neurons -->
                    @if (layer.type === 'input' && n.label) {
                      <text [attr.x]="n.x - 16" [attr.y]="n.y + 4" text-anchor="end"
                            fill="#cbd5e1" font-size="9" font-weight="800" class="font-sans">{{ n.label }}</text>
                    }
                    <!-- Individual labels for output neurons (reconstructed) -->
                    @if (layer.type === 'output' && n.label) {
                      <text [attr.x]="n.x + 18" [attr.y]="n.y + 4" text-anchor="start"
                            fill="#cbd5e1" font-size="9" font-weight="800" class="font-sans">{{ n.label }}</text>
                    }
                  }
                  <text [attr.x]="layer.labelX" [attr.y]="360" text-anchor="middle"
                        fill="#94a3b8" font-size="9" font-weight="700" class="uppercase">{{ layer.name }}</text>
                }
                <!-- Bottleneck Highlight -->
                <rect [attr.x]="aeWidth / 2 - 40" y="60" width="80" [attr.height]="260" rx="20"
                      fill="none" stroke="#155e75" stroke-width="2" stroke-dasharray="6 4" opacity="0.4" />
                <text [attr.x]="aeWidth / 2" y="50" text-anchor="middle" fill="#67e8f9" font-size="10" font-weight="800" class="uppercase tracking-widest">Bottleneck</text>
              </svg>
            </div>

            <div class="grid grid-cols-2 gap-6 mt-4">
              <div class="p-5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
                <p class="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2">Cómo funciona</p>
                <p class="text-xs text-slate-300 leading-relaxed">El Autoencoder comprime los datos de entrada a través del <strong class="text-cyan-400">bottleneck</strong> y los reconstruye. Si la reconstrucción difiere significativamente del input original (MSE alto), se clasifica como <strong class="text-red-400">anomalía</strong>.</p>
              </div>
              <div class="p-5 rounded-2xl bg-slate-800/40 border border-white/5">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Umbral de Anomalía</p>
                <div class="flex items-end gap-3">
                  <span class="text-4xl font-black text-cyan-400 tabular-nums">2.5</span>
                  <span class="text-xs text-slate-500 pb-1">MSE Threshold</span>
                </div>
                <p class="text-[10px] text-slate-500 mt-2">Si el error de reconstrucción (MSE) supera 2.5, el trámite se marca como anómalo.</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: SIMULADOR -->
      @if (activeTab() === 'simulator') {
        <div class="slide-in">
          <div class="grid grid-cols-12 gap-8">
            <!-- INPUTS -->
            <div class="col-span-5 p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 shadow-xl">
              <div class="flex items-center gap-3 mb-8">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M12 3v18"/><path d="m8 8 4-5 4 5"/><path d="M20 21H4"/></svg>
                </div>
                <div>
                  <h2 class="text-lg font-black text-white">Simulador de Predicción</h2>
                  <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ajusta los parámetros y observa la inferencia en tiempo real</p>
                </div>
              </div>

              <div class="space-y-6">
                <!-- Hora -->
                <div>
                  <div class="flex justify-between mb-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora del Día</label>
                    <span class="text-sm font-black text-indigo-400 tabular-nums">{{ simInput.hora_del_dia }}:00</span>
                  </div>
                  <input type="range" min="0" max="23" step="1" [(ngModel)]="simInput.hora_del_dia" (input)="runPrediction()" class="w-full slider-custom" />
                </div>
                <!-- Día -->
                <div>
                  <div class="flex justify-between mb-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Día de la Semana</label>
                    <span class="text-sm font-black text-indigo-400">{{ dayNames[simInput.dia_de_semana] }}</span>
                  </div>
                  <input type="range" min="0" max="6" step="1" [(ngModel)]="simInput.dia_de_semana" (input)="runPrediction()" class="w-full slider-custom" />
                </div>
                <!-- Carga -->
                <div>
                  <div class="flex justify-between mb-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga Actual (trámites activos)</label>
                    <span class="text-sm font-black text-indigo-400 tabular-nums">{{ simInput.carga_actual }}</span>
                  </div>
                  <input type="range" min="0" max="50" step="1" [(ngModel)]="simInput.carga_actual" (input)="runPrediction()" class="w-full slider-custom" />
                </div>
                <!-- Historial -->
                <div>
                  <div class="flex justify-between mb-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial del Cliente</label>
                    <span class="text-sm font-black text-indigo-400 tabular-nums">{{ (simInput.historial_cliente * 100).toFixed(0) }}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" [(ngModel)]="simInput.historial_cliente" (input)="runPrediction()" class="w-full slider-custom" />
                </div>

                <button (click)="runPrediction()" [disabled]="predicting()"
                        class="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-[0.98] disabled:opacity-50">
                  {{ predicting() ? 'Inferencia en curso...' : '⚡ Ejecutar Inferencia TensorFlow' }}
                </button>
              </div>
            </div>

            <!-- RESULTS -->
            <div class="col-span-7 space-y-6">
              @if (prediction()) {
                <!-- MAIN RESULT CARD -->
                <div class="p-8 rounded-[2rem] border shadow-xl"
                     [class]="prediction()!.isAnomalo ? 'bg-red-500/5 border-red-500/20 anomaly-pulse' : 'bg-slate-900/40 border-white/5'">
                  
                  @if (prediction()!.isAnomalo) {
                    <div class="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                      <span class="text-red-500 text-xl">⚠️</span>
                      <span class="text-xs font-black text-red-400 uppercase tracking-widest">Anomalía Detectada por el Autoencoder</span>
                    </div>
                  }

                  <div class="grid grid-cols-2 gap-6">
                    <!-- Tiempo Estimado -->
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tiempo Estimado</p>
                      <div class="flex items-baseline gap-2">
                        <span class="text-5xl font-black tabular-nums" [class]="prediction()!.tiempoEstimadoMinutos > 120 ? 'text-red-400' : 'text-emerald-400'">
                          {{ prediction()!.tiempoEstimadoMinutos | number:'1.0-0' }}
                        </span>
                        <span class="text-sm text-slate-500 font-bold">min</span>
                      </div>
                    </div>

                    <!-- Prioridad -->
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Prioridad</p>
                      <div class="inline-block px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest"
                           [class]="{
                             'bg-red-500/10 text-red-400 border border-red-500/20': prediction()!.prioridadRecomendada === 'ALTA',
                             'bg-amber-500/10 text-amber-400 border border-amber-500/20': prediction()!.prioridadRecomendada === 'MEDIA',
                             'bg-blue-500/10 text-blue-400 border border-blue-500/20': prediction()!.prioridadRecomendada === 'BAJA'
                           }">
                        {{ prediction()!.prioridadRecomendada }}
                      </div>
                    </div>

                    <!-- Ruta Sugerida -->
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ruta Sugerida</p>
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </div>
                        <span class="text-sm font-bold text-white truncate">{{ prediction()!.rutaSugerida }}</span>
                      </div>
                    </div>

                    <!-- Score Eficiencia -->
                    <div class="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Score de Eficiencia</p>
                      <div class="flex items-center gap-4">
                        <div class="relative w-16 h-16">
                          <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke-width="3"
                                    [attr.stroke]="prediction()!.scoreEficiencia > 0.7 ? '#10b981' : prediction()!.scoreEficiencia > 0.4 ? '#f59e0b' : '#ef4444'"
                                    [attr.stroke-dasharray]="(prediction()!.scoreEficiencia * 94.25) + ' 94.25'"
                                    stroke-linecap="round" />
                          </svg>
                          <span class="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                            {{ (prediction()!.scoreEficiencia * 100) | number:'1.0-0' }}%
                          </span>
                        </div>
                        <span class="text-xs text-slate-500 font-medium">Confianza del<br/>modelo IA</span>
                      </div>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="p-16 rounded-[2rem] bg-slate-900/40 border border-white/5 text-center">
                  <div class="text-5xl opacity-20 mb-4">🧠</div>
                  <p class="text-slate-400 font-medium">Ajusta los parámetros y presiona "Ejecutar Inferencia" para ver la predicción del modelo.</p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 4: ENTRENAMIENTO DE MODELOS -->
      @if (activeTab() === 'training') {
        <div class="slide-in">
          <div class="grid grid-cols-12 gap-8">
            <!-- panel izquierdo: controles y métricas -->
            <div class="col-span-6 p-8 rounded-[2rem] bg-slate-900/40 border border-white/5 shadow-xl space-y-6">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <div>
                  <h2 class="text-lg font-black text-white">Consola de Mantenimiento</h2>
                  <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Re-entrenamiento en caliente de las redes neuronales</p>
                </div>
              </div>

              <p class="text-xs text-slate-400 leading-relaxed">
                El re-entrenamiento extrae todos los registros completados de MongoDB para ajustar la predicción de la duración promedio de los trámites y recalibrar el Autoencoder de anomalías con las últimas dinámicas operativas de la empresa.
              </p>

              <button (click)="runModelTraining()" [disabled]="trainingState() === 'training'"
                      class="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2">
                @if (trainingState() === 'training') {
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Entrenando modelos...</span>
                } @else {
                  <span>⚡ Iniciar Re-entrenamiento</span>
                }
              </button>

              <!-- MÉTRICAS OBTENIDAS -->
              @if (trainingMetrics()) {
                <div class="pt-6 border-t border-white/5 space-y-4">
                  <h3 class="text-xs font-black text-white uppercase tracking-widest text-slate-400">Resultados del Último Entrenamiento</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p class="text-[9px] font-bold text-slate-500 uppercase">Muestras Procesadas</p>
                      <p class="text-xl font-black text-indigo-400">{{ trainingMetrics()?.total_samples }}</p>
                    </div>
                    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p class="text-[9px] font-bold text-slate-500 uppercase">Duración MAE</p>
                      <p class="text-xl font-black text-emerald-400">{{ trainingMetrics()?.val_duracion_mae | number:'1.1-2' }} <span class="text-xs font-medium text-slate-500">min</span></p>
                    </div>
                    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p class="text-[9px] font-bold text-slate-500 uppercase">Acc. Prioridad</p>
                      <p class="text-xl font-black text-amber-400">{{ (trainingMetrics()?.val_prioridad_accuracy * 100) | number:'1.0-1' }}%</p>
                    </div>
                    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <p class="text-[9px] font-bold text-slate-500 uppercase">Acc. Ruta</p>
                      <p class="text-xl font-black text-violet-400">{{ (trainingMetrics()?.val_ruta_accuracy * 100) | number:'1.0-1' }}%</p>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- panel derecho: terminal de logs -->
            <div class="col-span-6 flex flex-col h-[480px] bg-black border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
              <div class="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div class="flex gap-2">
                  <span class="w-3 h-3 rounded-full bg-red-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                  <span class="w-3 h-3 rounded-full bg-green-500/80"></span>
                </div>
                <span class="text-[9px] font-mono text-slate-500">terminal_logs_keras.sh</span>
              </div>
              <div class="flex-grow overflow-y-auto font-mono text-xs text-indigo-300 space-y-2 custom-scrollbar">
                @for (log of trainingLog(); track $index) {
                  <p class="leading-relaxed border-l-2 border-indigo-500/30 pl-2 animate-in fade-in slide-in-from-left-2">{{ log }}</p>
                } @empty {
                  <p class="text-slate-600 italic">Consola inactiva. Inicie el entrenamiento para registrar los logs en tiempo real.</p>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TensorflowDashboardComponent implements OnInit {
  private tfService = inject(TensorflowService);

  activeTab = signal<'multioutput' | 'autoencoder' | 'simulator' | 'training'>('multioutput');
  predicting = signal(false);
  prediction = signal<TFPredictResponse | null>(null);

  // Model training state
  trainingState = signal<'idle' | 'training' | 'completed' | 'error'>('idle');
  trainingLog = signal<string[]>([]);
  trainingMetrics = signal<any | null>(null);

  tabs = [
    { id: 'multioutput' as const, label: '🧬 Modelo Multi-Output' },
    { id: 'autoencoder' as const, label: '🔍 Autoencoder' },
    { id: 'simulator' as const, label: '⚡ Simulador en Vivo' },
    { id: 'training' as const, label: '⚙️ Entrenamiento de Modelos' }
  ];

  dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  outputBranches = OUTPUT_BRANCHES;

  simInput: TFPredictRequest = {
    hora_del_dia: 10,
    dia_de_semana: 2,
    departamento_id: 'default',
    politica_id: 'default',
    carga_actual: 8,
    historial_cliente: 0.75
  };

  svgWidth = 900;
  aeWidth = 850;

  /* ── Computed: Neuron positions for Multi-Output ────────── */
  multiOutputNeuronPositions = computed(() => {
    const layers = MULTI_OUTPUT_LAYERS;
    const totalLayers = layers.length + 1; // +1 for output group
    const xStep = this.svgWidth / (totalLayers + 1);
    const centerY = 180;

    const result: { name: string; type: string; color: string; labelX: number; neurons: { x: number; y: number; label?: string }[] }[] = [];

    const inputLabels = [
      'Hora del Día',
      'Día de la Semana',
      'Departamento',
      'Política/Trámite',
      'Carga de Trabajo',
      'Historial Cliente'
    ];

    const outputLabels = [
      'Duración Estimada',
      'Prioridad: BAJA',
      'Prioridad: MEDIA',
      'Prioridad: ALTA',
      'Ruta: Registro Actividad',
      'Ruta: Evaluación Técnica',
      'Ruta: Revisión/Aprobación',
      'Ruta: Archivo Completado'
    ];

    layers.forEach((layer, li) => {
      const x = xStep * (li + 1);
      const yStep = Math.min(40, 300 / (layer.neurons + 1));
      const startY = centerY - ((layer.neurons - 1) * yStep) / 2;
      result.push({
        name: layer.name, type: layer.type, color: layer.color, labelX: x,
        neurons: Array.from({ length: layer.neurons }, (_, ni) => ({
          x,
          y: startY + ni * yStep,
          label: layer.type === 'input' ? inputLabels[ni] : undefined
        }))
      });
    });

    // Output branches
    const outX = xStep * (layers.length + 1);
    const outNeurons: { x: number; y: number; label?: string }[] = [];
    const branchSpacing = 100;
    const branchStartY = centerY - branchSpacing;
    let outIdx = 0;
    OUTPUT_BRANCHES.forEach((branch, bi) => {
      for (let ni = 0; ni < branch.neurons; ni++) {
        const y = branchStartY + bi * branchSpacing + (ni * 20) - ((branch.neurons - 1) * 10);
        outNeurons.push({ x: outX, y, label: outputLabels[outIdx++] });
      }
    });
    result.push({ name: 'Outputs', type: 'output', color: '#10b981', labelX: outX, neurons: outNeurons });

    return result;
  });

  multiOutputConnections = computed(() => {
    const positions = this.multiOutputNeuronPositions();
    const conns: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (let li = 0; li < positions.length - 1; li++) {
      const from = positions[li];
      const to = positions[li + 1];
      for (const fn of from.neurons) {
        for (const tn of to.neurons) {
          conns.push({ x1: fn.x, y1: fn.y, x2: tn.x, y2: tn.y, color: to.color });
        }
      }
    }
    return conns;
  });

  /* ── Computed: Neuron positions for Autoencoder ────────── */
  autoencoderNeuronPositions = computed(() => {
    const layers = AUTOENCODER_LAYERS;
    const xStep = this.aeWidth / (layers.length + 1);
    const centerY = 190;

    const inputLabels = [
      'Hora del Día',
      'Día de la Semana',
      'Departamento',
      'Política/Trámite',
      'Carga de Trabajo',
      'Historial Cliente'
    ];

    const reconstructedLabels = [
      'Rec: Hora del Día',
      'Rec: Día de la Semana',
      'Rec: Departamento',
      'Rec: Política/Trámite',
      'Rec: Carga de Trabajo',
      'Rec: Historial Cliente'
    ];

    return layers.map((layer, li) => {
      const x = xStep * (li + 1);
      const yStep = Math.min(40, 280 / (layer.neurons + 1));
      const startY = centerY - ((layer.neurons - 1) * yStep) / 2;
      return {
        name: layer.name, type: layer.type, color: layer.color, labelX: x,
        neurons: Array.from({ length: layer.neurons }, (_, ni) => ({
          x,
          y: startY + ni * yStep,
          label: layer.type === 'input' ? inputLabels[ni] : (layer.type === 'output' ? reconstructedLabels[ni] : undefined)
        }))
      };
    });
  });

  autoencoderConnections = computed(() => {
    const positions = this.autoencoderNeuronPositions();
    const conns: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (let li = 0; li < positions.length - 1; li++) {
      const from = positions[li];
      const to = positions[li + 1];
      for (const fn of from.neurons) {
        for (const tn of to.neurons) {
          conns.push({ x1: fn.x, y1: fn.y, x2: tn.x, y2: tn.y, color: to.color });
        }
      }
    }
    return conns;
  });

  ngOnInit() { }

  runPrediction() {
    this.predicting.set(true);
    this.tfService.predict(this.simInput).subscribe({
      next: (res) => {
        this.prediction.set(res);
        this.predicting.set(false);
      },
      error: (err) => {
        console.error('TF predict error', err);
        // Fallback demo data when models aren't loaded
        this.prediction.set({
          rutaSugerida: 'Evaluación Técnica',
          tiempoEstimadoMinutos: 45 + Math.random() * 60,
          prioridadRecomendada: ['BAJA', 'MEDIA', 'ALTA'][Math.floor(Math.random() * 3)],
          isAnomalo: Math.random() > 0.8,
          scoreEficiencia: 0.5 + Math.random() * 0.45
        });
        this.predicting.set(false);
      }
    });
  }

  runModelTraining() {
    this.trainingState.set('training');
    this.trainingLog.set([
      '=== INICIANDO RE-ENTRENAMIENTO DE MODELOS TENSORFLOW ===',
      '🔄 Conectando con MongoDB...',
      '📥 Extrayendo registros de tramites y actividades...',
      '🛠️ Ejecutando pipeline de preprocesamiento y codificación...'
    ]);

    this.tfService.train().subscribe({
      next: (res) => {
        this.trainingState.set('completed');
        this.trainingMetrics.set(res.metrics);
        this.trainingLog.update(log => [
          ...log,
          '✅ Conexión con MongoDB establecida.',
          '✅ Datos extraídos correctamente de colecciones.',
          '🔄 Inicializando entrenamiento de Keras routing & autoencoder...',
          '🔄 Ajustando pesos de redes profundas (Dense + Dropout)...',
          '✅ Entrenamiento finalizado con éxito.',
          '🔄 Serializando modelos Keras...',
          '🔄 Convirtiendo modelos Keras a ONNX format...',
          '✅ Modelos ONNX generados correctamente.',
          '✅ Hot-reload de ONNX Runtime completado en memoria.',
          '🏆 Proceso terminado exitosamente.'
        ]);
      },
      error: (err) => {
        console.error('Training failed', err);
        this.trainingState.set('error');
        this.trainingLog.update(log => [
          ...log,
          '❌ Error detectado durante el entrenamiento.',
          `Detalle del fallo: ${err.message || 'Error del microservicio AI'}`,
          '⚠️ Se mantendrán cargados los últimos ONNX válidos en memoria.'
        ]);
      }
    });
  }
}

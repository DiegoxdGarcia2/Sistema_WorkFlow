import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import type { EChartsOption } from 'echarts';

import { MlAnalysisService, InsightsResult } from '../../services/ml-analysis.service';
import { AiAssistantService } from '../../services/ai-assistant.service';

@Component({
  selector: 'app-ml-analytics',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  template: `
    <div class="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      
      <!-- LOADING SKELETON -->
      @if (svc.isLoadingInsights()) {
        <div class="flex-1 flex flex-col gap-6">
          <div class="grid grid-cols-4 gap-6">
            @for (i of [1,2,3,4]; track i) {
              <div class="h-32 bg-slate-800/40 rounded-[2rem] animate-pulse border border-white/5"></div>
            }
          </div>
          <div class="flex-1 grid grid-cols-12 gap-6">
            <div class="col-span-8 bg-slate-800/40 rounded-[2rem] animate-pulse border border-white/5"></div>
            <div class="col-span-4 bg-slate-800/40 rounded-[2rem] animate-pulse border border-white/5"></div>
          </div>
        </div>
      }
      
      <!-- ERROR STATE -->
      @else if (error()) {
        <div class="flex-1 flex flex-col items-center justify-center bg-red-500/5 rounded-[2rem] border border-red-500/20 p-10 text-center">
          <div class="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-3xl mb-6 shadow-lg shadow-red-500/10">!</div>
          <h3 class="text-2xl font-bold text-red-400 mb-2">Error de conexión</h3>
          <p class="text-slate-400 max-w-md mx-auto mb-8">{{ error() }}</p>
          <button (click)="cargarInsights()" class="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95">Reintentar</button>
        </div>
      }
      
      <!-- EMPTY STATE -->
      @else if (!insights()?.metricas?.totalRegistros) {
        <div class="flex-1 flex flex-col items-center justify-center bg-slate-800/20 rounded-[2rem] border border-white/5 p-10 text-center">
          <div class="w-24 h-24 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-4xl mb-6 ring-4 ring-indigo-500/5">📊</div>
          <h3 class="text-xl font-bold text-white mb-2">Datos Insuficientes</h3>
          <p class="text-slate-400 max-w-md mx-auto mb-8">El motor de Machine Learning requiere más datos históricos de ejecuciones de procesos para poder generar predicciones y cuellos de botella confiables.</p>
          <button (click)="cargarInsights()" class="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95">Verificar Nuevamente</button>
        </div>
      }
      
      <!-- DASHBOARD COMPLETADO -->
      @else {
        <!-- KPIs Superiores -->
        <div class="grid grid-cols-4 gap-6">
          <div class="p-6 rounded-[2rem] border border-white/5 bg-slate-900/60 shadow-xl relative overflow-hidden group">
            <div class="flex items-center gap-4 mb-2 relative">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-indigo-500 to-blue-500">📊</div>
              <div>
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Registros</p>
                <p class="text-2xl font-black text-white tabular-nums">{{ insights()?.metricas?.totalRegistros }}</p>
              </div>
            </div>
            <p class="text-xs text-slate-400 font-medium">Analizados en MongoDB</p>
          </div>
          
          <div class="p-6 rounded-[2rem] border border-white/5 bg-slate-900/60 shadow-xl relative overflow-hidden group">
            <div class="flex items-center gap-4 mb-2 relative">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-sky-500 to-teal-500">⏱️</div>
              <div>
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Promedio Global</p>
                <p class="text-2xl font-black text-white tabular-nums">{{ insights()?.metricas?.duracionPromedioMinutos }} <span class="text-sm text-slate-500 font-bold">min</span></p>
              </div>
            </div>
            <p class="text-xs text-slate-400 font-medium">Tasa: {{ (insights()?.metricas?.tasaCompletitud || 0) * 100 | number:'1.0-0' }}% completitud</p>
          </div>

          <div class="p-6 rounded-[2rem] border border-white/5 bg-slate-900/60 shadow-xl relative overflow-hidden group">
            <div class="flex items-center gap-4 mb-2 relative">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-purple-500 to-pink-500">🔮</div>
              <div>
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Predicción</p>
                <p class="text-2xl font-black text-white tabular-nums">{{ insights()?.prediccion?.duracionEstimadaDias }} <span class="text-sm text-slate-500 font-bold">días</span></p>
              </div>
            </div>
            <p class="text-xs text-slate-400 font-medium truncate" [title]="insights()?.prediccion?.factoresRelevantes?.join(', ')">Basado en: {{ insights()?.prediccion?.factoresRelevantes?.[0] || 'Factores múltiples' }}</p>
          </div>

          <div class="p-6 rounded-[2rem] border border-white/5 bg-slate-900/60 shadow-xl relative overflow-hidden group">
            <div class="flex items-center gap-4 mb-2 relative">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br from-emerald-500 to-green-500">🎯</div>
              <div>
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confianza Modelo</p>
                <p class="text-2xl font-black text-white tabular-nums">{{ ((insights()?.prediccion?.confianza || 0) * 100) | number:'1.0-0' }}%</p>
              </div>
            </div>
            <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-3">
              <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000" [style.width.%]="(insights()?.prediccion?.confianza || 0) * 100"></div>
            </div>
          </div>
        </div>

        <div class="flex-1 grid grid-cols-12 gap-6 min-h-[400px]">
          <!-- GRÁFICO CUELLOS DE BOTELLA -->
          <div class="col-span-8 bg-slate-900/60 rounded-[2rem] border border-white/5 shadow-xl p-6 flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg font-bold text-white">Cuellos de Botella Detectados</h3>
                <p class="text-xs text-slate-400">Actividades que superan estadísticamente la desviación promedio.</p>
              </div>
              <span class="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-white/5">
                {{ insights()?.cuellosBottella?.length || 0 }} anomalías
              </span>
            </div>
            
            <div class="flex-1 w-full relative">
              @if (insights()?.cuellosBottella?.length === 0) {
                <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <div class="text-4xl mb-3">✅</div>
                  <p class="font-bold">No se detectaron cuellos de botella</p>
                </div>
              } @else {
                <div echarts [options]="chartOptions()" class="w-full h-full min-h-[300px]"></div>
              }
            </div>
          </div>

          <!-- PANEL GROQ INSIGHTS -->
          <div class="col-span-4 bg-gradient-to-b from-indigo-950/40 to-slate-900/60 rounded-[2rem] border border-indigo-500/20 shadow-xl shadow-indigo-500/5 p-6 flex flex-col relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
            
            <div class="flex items-center justify-between mb-6 relative z-10">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">✨</div>
                <h3 class="font-bold text-white tracking-tight">Análisis de IA</h3>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="narrarInsights()" 
                        class="text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 p-2 rounded-xl flex items-center gap-1.5"
                        [title]="isNarrating ? 'Detener Narración' : 'Escuchar Conclusiones'">
                  <span>{{ isNarrating ? '⏹️' : '🔊' }}</span>
                  <span class="text-[9px] font-bold uppercase tracking-wider">Escuchar</span>
                </button>
                <button (click)="cargarInsights()" class="text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 p-2 rounded-xl" title="Regenerar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar text-sm text-slate-300 leading-relaxed space-y-4 relative z-10">
              <div class="prose prose-invert prose-p:my-2 prose-strong:text-white prose-strong:font-bold prose-sm max-w-none"
                   [innerHTML]="getSafeHtml(insights()?.insightsNaturales || '')">
              </div>

              <!-- Alertas list -->
              @if (insights()?.alertas?.length) {
                <div class="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-widest text-slate-500">Alertas del Sistema</h4>
                  @for (alerta of insights()?.alertas; track $index) {
                    <div class="p-3 rounded-xl border flex items-start gap-3"
                         [class]="alerta.nivel === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'">
                      <div class="mt-0.5">{{ alerta.nivel === 'CRITICAL' ? '⚠️' : '⚡' }}</div>
                      <p class="text-xs font-medium">{{ alerta.mensaje }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
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
export class MlAnalyticsComponent implements OnInit {
  svc = inject(MlAnalysisService);
  private sanitizer = inject(DomSanitizer);
  private aiSvc = inject(AiAssistantService);

  insights = this.svc.lastInsights;
  error = signal<string | null>(null);
  isNarrating = false;

  narrarInsights() {
    if (this.isNarrating) {
      this.aiSvc.detenerHablar();
      this.isNarrating = false;
    } else {
      const text = this.insights()?.insightsNaturales || '';
      const cleanText = text.replace(/<[^>]*>/g, '').replace(/\*/g, '');
      if (cleanText) {
        this.aiSvc.hablar(cleanText);
        this.isNarrating = true;
      }
    }
  }

  chartOptions = computed<EChartsOption>(() => {
    const data = this.insights();
    if (!data || !data.cuellosBottella || data.cuellosBottella.length === 0) {
      return {};
    }

    // Preparar datos para ECharts
    // Invertir para que el mayor quede arriba
    const sorted = [...data.cuellosBottella].reverse();
    const categories = sorted.map(c => c.actividadNombre);
    const values = sorted.map(c => ({
      value: c.promedioMinutos,
      name: c.actividadNombre,
      itemStyle: {
        color: c.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
        borderRadius: [0, 4, 4, 0]
      },
      // Metadatos extra para el tooltip
      desviacion: c.desviacionSobre,
      ejecuciones: c.numEjecuciones
    }));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#f8fafc' },
        formatter: (params: any) => {
          const p = params[0].data;
          return `
            <div class="font-bold mb-1">${p.name}</div>
            <div class="text-xs text-slate-300">
              Promedio: <span class="font-bold text-white">${p.value} min</span><br/>
              Desviación: <span class="font-bold text-red-400">${p.desviacion}x</span> más lento<br/>
              Casos: ${p.ejecuciones} ejecuciones
            </div>
          `;
        }
      },
      grid: {
        left: '3%',
        right: '6%',
        bottom: '3%',
        top: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Minutos',
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#94a3b8' },
        nameTextStyle: { color: '#64748b' }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { 
          color: '#cbd5e1',
          width: 150,
          overflow: 'truncate'
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      series: [
        {
          name: 'Promedio (min)',
          type: 'bar',
          data: values,
          barMaxWidth: 32,
          label: {
            show: true,
            position: 'right',
            formatter: '{c} min',
            color: '#94a3b8',
            fontSize: 10
          }
        }
      ]
    };
  });

  ngOnInit() {
    this.cargarInsights();
  }

  cargarInsights() {
    this.error.set(null);
    this.svc.isLoadingInsights.set(true);
    
    // Convertir markdown simple a HTML
    const mdToHtml = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>')
        .replace(/^- (.*)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    };

    this.svc.getInsights().subscribe({
      next: (res) => {
        // Parse markdown
        res.insightsNaturales = '<p>' + mdToHtml(res.insightsNaturales) + '</p>';
        this.svc.lastInsights.set(res);
        this.svc.isLoadingInsights.set(false);
      },
      error: (err) => {
        console.error('Error loading insights', err);
        this.error.set(err.message || 'Error al conectar con el servidor de análisis.');
        this.svc.isLoadingInsights.set(false);
      }
    });
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

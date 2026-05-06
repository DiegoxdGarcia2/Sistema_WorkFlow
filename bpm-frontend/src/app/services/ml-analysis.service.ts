import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PoliticaDTO } from '../models/bpm.models';
import { Observable } from 'rxjs';

export interface AnalysisResult {
  findings: Finding[];
  simulation: SimulationResult;
}

export interface Finding {
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  nodeId: string;
  message: string;
  suggestion: string;
}

export interface SimulationResult {
  averageTotalTimeMinutes: number;
  simulatedInstances: number;
  bottleneckCounts: Record<string, number>;
  averageNodeTimeMinutes: Record<string, number>;
  blockedInstances: number;
}

// ── Fase 3: Insights ──────────────────────────────────
export interface InsightMetrica {
  totalRegistros: number;
  duracionPromedioMinutos: number;
  desviacionEstandar: number;
  tasaCompletitud: number;
}

export interface InsightBottleneck {
  actividadId: string;
  actividadNombre: string;
  promedioMinutos: number;
  desviacionSobre: number;
  severity: 'CRITICAL' | 'WARNING';
  numEjecuciones: number;
}

export interface InsightPrediccion {
  duracionEstimadaDias: number;
  confianza: number;
  factoresRelevantes: string[];
}

export interface InsightsResult {
  politicaId: string | null;
  generadoEn: string;
  metricas: InsightMetrica;
  cuellosBottella: InsightBottleneck[];
  prediccion: InsightPrediccion;
  insightsNaturales: string;
  alertas: { nivel: string; mensaje: string }[];
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MlAnalysisService {
  private apiUrl = `${environment.apiUrl}/ml`;

  // State signals for UI binding
  public lastAnalysis = signal<AnalysisResult | null>(null);
  public isAnalyzing = signal<boolean>(false);

  // Signals for Phase 4 Analytics
  public lastInsights = signal<InsightsResult | null>(null);
  public isLoadingInsights = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  analyze(politica: PoliticaDTO): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.apiUrl}/analyze`, politica);
  }

  simulate(politica: PoliticaDTO, instances: number = 1000): Observable<SimulationResult> {
    return this.http.post<SimulationResult>(`${this.apiUrl}/simulate`, { politica, instances });
  }

  getInsights(politicaId?: string): Observable<InsightsResult> {
    const params = politicaId ? `?politicaId=${politicaId}` : '';
    return this.http.get<InsightsResult>(`${this.apiUrl}/insights${params}`);
  }
}

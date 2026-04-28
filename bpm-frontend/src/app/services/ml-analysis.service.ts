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

@Injectable({
  providedIn: 'root'
})
export class MlAnalysisService {
  private apiUrl = 'http://localhost:8080/api/ml';

  // State signals for UI binding
  public lastAnalysis = signal<AnalysisResult | null>(null);
  public isAnalyzing = signal<boolean>(false);

  constructor(private http: HttpClient) {}

  analyze(politica: PoliticaDTO): Observable<AnalysisResult> {
    return this.http.post<AnalysisResult>(`${this.apiUrl}/analyze`, politica);
  }

  simulate(politica: PoliticaDTO, instances: number = 1000): Observable<SimulationResult> {
    return this.http.post<SimulationResult>(`${this.apiUrl}/simulate`, { politica, instances });
  }
}

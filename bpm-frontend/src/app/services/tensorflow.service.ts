import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TFPredictRequest {
  hora_del_dia: number;
  dia_de_semana: number;
  departamento_id: string;
  politica_id: string;
  carga_actual: number;
  historial_cliente: number;
}

export interface TFPredictResponse {
  rutaSugerida: string;
  tiempoEstimadoMinutos: number;
  prioridadRecomendada: string;
  isAnomalo: boolean;
  scoreEficiencia: number;
}

@Injectable({
  providedIn: 'root'
})
export class TensorflowService {
  private http = inject(HttpClient);

  predict(req: TFPredictRequest): Observable<TFPredictResponse> {
    return this.http.post<TFPredictResponse>(`${environment.aiServiceUrl}/predict-route`, req);
  }

  train(): Observable<any> {
    return this.http.post<any>(`${environment.aiServiceUrl}/train`, {});
  }
}

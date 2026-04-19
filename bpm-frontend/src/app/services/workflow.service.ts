import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  TramiteDTO,
  RegistroActividadDTO,
  IniciarTramiteRequest,
  CompletarTareaRequest,
  TrackingDTO,
} from '../models/bpm.models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly tramitesUrl = 'http://localhost:8080/api/tramites';
  private readonly registrosUrl = 'http://localhost:8080/api/registros';

  /** Signals reactivos */
  tareasPendientes = signal<RegistroActividadDTO[]>([]);
  tramites = signal<TramiteDTO[]>([]);

  constructor(private http: HttpClient) {}

  // ── Trámites ──────────────────────────────────────────────

  iniciarTramite(request: IniciarTramiteRequest): Observable<TramiteDTO> {
    return this.http.post<TramiteDTO>(this.tramitesUrl, request);
  }

  listarTramites(tenantId: string, estado: string = 'EN_PROGRESO'): Observable<TramiteDTO[]> {
    return this.http
      .get<TramiteDTO[]>(`${this.tramitesUrl}/tenant/${tenantId}?estado=${estado}`)
      .pipe(tap(data => this.tramites.set(data)));
  }

  cancelarTramite(id: string): Observable<TramiteDTO> {
    return this.http.patch<TramiteDTO>(`${this.tramitesUrl}/${id}/cancelar`, {});
  }

  // ── Registros de Actividad ────────────────────────────────

  listarRegistrosPorTramite(tramiteId: string): Observable<RegistroActividadDTO[]> {
    return this.http.get<RegistroActividadDTO[]>(`${this.registrosUrl}/tramite/${tramiteId}`);
  }

  cargarBandejaPendientes(userId: string): Observable<RegistroActividadDTO[]> {
    return this.http
      .get<RegistroActividadDTO[]>(`${this.registrosUrl}/pendientes/${userId}`)
      .pipe(tap(data => this.tareasPendientes.set(data)));
  }

  tomarTarea(registroId: string, userId: string): Observable<RegistroActividadDTO> {
    return this.http.patch<RegistroActividadDTO>(
      `${this.registrosUrl}/${registroId}/tomar?userId=${userId}`,
      {}
    );
  }

  /**
   * Completa la tarea → backend ejecuta derivar() → genera siguiente registro.
   * Después recarga la bandeja para reflejar el nuevo estado.
   */
  completarTarea(request: CompletarTareaRequest, userId: string): Observable<RegistroActividadDTO> {
    return this.http
      .patch<RegistroActividadDTO>(`${this.registrosUrl}/completar`, request)
      .pipe(tap(() => this.cargarBandejaPendientes(userId).subscribe()));
  }

  // ── Portal del Cliente: Tracking ────────────────────────────

  getTracking(tramiteId: string): Observable<TrackingDTO> {
    return this.http.get<TrackingDTO>(`${this.tramitesUrl}/${tramiteId}/tracking`);
  }

  // ── Tareas sin asignar (para cualquier funcionario) ─────────

  tareasNoAsignadas = signal<RegistroActividadDTO[]>([]);

  cargarTareasNoAsignadas(): Observable<RegistroActividadDTO[]> {
    return this.http
      .get<RegistroActividadDTO[]>(`${this.registrosUrl}/sin-asignar`)
      .pipe(tap(data => this.tareasNoAsignadas.set(data)));
  }
}

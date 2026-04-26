import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, forkJoin, map as rxMap } from 'rxjs';
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
  historial = signal<RegistroActividadDTO[]>([]);
  tramites = signal<TramiteDTO[]>([]);

  constructor(private http: HttpClient) {}

  limpiarEstado() {
    this.tareasPendientes.set([]);
    this.historial.set([]);
    this.tramites.set([]);
    this.tareasNoAsignadas.set([]);
  }

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

  cargarBandejaUnificada(userId: string, deptoId?: string): Observable<RegistroActividadDTO[]> {
    const personales$ = this.http.get<RegistroActividadDTO[]>(`${this.registrosUrl}/pendientes/${userId}`);
    
    if (!deptoId) {
      return personales$.pipe(tap(data => this.tareasPendientes.set(data)));
    }

    const depto$ = this.http.get<RegistroActividadDTO[]>(`${this.registrosUrl}/sin-asignar-departamento/${deptoId}`);

    return forkJoin({ personales: personales$, depto: depto$ }).pipe(
      tap(({ personales, depto }) => {
        const map = new Map();
        [...personales, ...depto].forEach(t => map.set(t.id, t));
        this.tareasPendientes.set(Array.from(map.values()));
      }),
      rxMap(res => {
        const map = new Map();
        [...res.personales, ...res.depto].forEach(t => map.set(t.id, t));
        return Array.from(map.values());
      })
    );
  }

  cargarBandejaDepartamento(deptoId: string): Observable<RegistroActividadDTO[]> {
    return this.http
      .get<RegistroActividadDTO[]>(`${this.registrosUrl}/bandeja-departamento/${deptoId}`)
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

  cargarTareasNoAsignadasDepartamento(deptoId: string): Observable<RegistroActividadDTO[]> {
    return this.http
      .get<RegistroActividadDTO[]>(`${this.registrosUrl}/sin-asignar-departamento/${deptoId}`)
      .pipe(tap(data => this.tareasNoAsignadas.set(data)));
  }

  cargarHistorial(userId: string): Observable<RegistroActividadDTO[]> {
    return this.http
      .get<RegistroActividadDTO[]>(`${this.registrosUrl}/historial/${userId}`)
      .pipe(tap(data => this.historial.set(data)));
  }
}

// Interfaces TypeScript que coinciden EXACTAMENTE con los DTOs del backend Spring Boot

// ── Enums ──

export type TipoActividad = 'TAREA' | 'INICIO' | 'FIN' | 'FORK' | 'JOIN' | 'DECISION' | 'MERGE';
export type TipoRuta = 'SECUENCIAL' | 'CONDICIONAL' | 'PARALELA';
export type EstadoTramite = 'INICIADO' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoRegistro = 'PENDIENTE' | 'EN_PROGRESO' | 'HECHO' | 'BLOQUEADO';

// ── Embebidos ──

export interface Actividad {
  id: string;
  nombre: string;
  tipo: TipoActividad;
  esInicial: boolean;
  esFinal: boolean;
  orden: number;
  esquemaFormulario?: Record<string, any>;
}

export interface Calle {
  id: string;
  nombre: string;
  orden: number;
  actividades: Actividad[];
}

export interface Transicion {
  id: string;
  origenId: string;
  destinoId: string;
  tipoRuta: TipoRuta;
  condicion: string;
  etiqueta: string;
  prioridad: number;
}

// ── DTOs (coinciden con backend) ──

export interface PoliticaDTO {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string;
  version: number;
  estaActiva: boolean;
  calles: Calle[];
  transiciones: Transicion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface TramiteDTO {
  id: string;
  politicaId: string;
  politicaNombre: string;
  tenantId: string;
  estado: EstadoTramite;
  iniciadoEn: string;
  finalizadoEn: string | null;
}

export interface RegistroActividadDTO {
  id: string;
  tramiteId: string;
  actividadId: string;
  actividadNombre: string;
  ejecutadoPor: string | null;
  estado: EstadoRegistro;
  esquemaFormulario: Record<string, any>;
  datosFormulario: Record<string, any>;
  notas: string;
  asignadoEn: string;
  completadoEn: string | null;
}

// ── Requests ──

export interface IniciarTramiteRequest {
  politicaId: string;
}

export interface CompletarTareaRequest {
  registroId: string;
  esquemaFormulario: Record<string, any>;
  datosFormulario: Record<string, any>;
  notas: string;
}

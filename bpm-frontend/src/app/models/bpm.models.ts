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
  esquemaFormulario?: {
    fields: Array<{
      key: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
      validations?: {
        min?: number;
        max?: number;
        pattern?: string;
        customMsg?: string;
      };
    }>;
  };

  // Estilo visual
  color?: string;
  descripcion?: string;
  ancho?: number;
  alto?: number;
  fontSize?: 'sm' | 'md' | 'lg';

  // Posición en canvas
  posX?: number;
  posY?: number;

  plantillaId?: string; // ID de la plantilla de formulario vinculada
}

export interface Calle {
  id: string;
  nombre: string;
  orden: number;
  color?: string;
  ancho?: number;
  departamentoId?: string;
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

  // Estilo visual
  color?: string;
  tipoLinea?: 'solida' | 'punteada' | 'discontinua';
  grosor?: number;
  origenAnchor?: 'top' | 'bottom' | 'left' | 'right';
  destinoAnchor?: 'top' | 'bottom' | 'left' | 'right';
}

// ── DTOs (coinciden con backend) ──

export interface PoliticaDTO {
  id: string;
  tenantId: string;
  proyectoId?: string;
  nombre: string;
  descripcion: string;
  version: number;
  estaActiva: boolean;
  calles: Calle[];
  transiciones: Transicion[];
  creadoEn: string;
  actualizadoEn: string;
}

export interface ProyectoDTO {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string;
  color: string;
  responsable: string;
  estado: 'ACTIVO' | 'ARCHIVADO';
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
  archivos: any[];
  departamentoId: string;
  notas: string;
  asignadoEn: string;
  completadoEn: string | null;
}

// ── Requests ──

export interface IniciarTramiteRequest {
  politicaId: string;
  usuarioId?: string;
}

export interface CompletarTareaRequest {
  registroId: string;
  esquemaFormulario: Record<string, any>;
  datosFormulario: Record<string, any>;
  archivos?: any[];
  notas: string;
}

// ── Tracking (Portal del Cliente) ──

export interface PasoTimeline {
  registroId: string;
  actividadNombre: string;
  calleNombre: string;
  estado: string;
  ejecutadoPor: string | null;
  notas: string;
  asignadoEn: string | null;
  completadoEn: string | null;
  datosFormulario: Record<string, any> | null;
  esquemaFormulario: Record<string, any> | null;
  archivos: any[] | null;
}

export interface TrackingDTO {
  tramite: TramiteDTO;
  timeline: PasoTimeline[];
}

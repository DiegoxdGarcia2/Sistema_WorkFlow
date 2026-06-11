from pydantic import BaseModel, Field
from typing import Optional, List, Dict

# ── Asistente IA (Designer) ──────────────────────────────────────
class AiCommandRequest(BaseModel):
    politicaId: Optional[str] = None
    instruccion: str
    contexto: Optional[dict] = None


class AiAction(BaseModel):
    tipo: str
    params: dict = Field(default_factory=dict)


class AiActionResponse(BaseModel):
    explicacion: str
    acciones: list[AiAction] = Field(default_factory=list)


# ── Chatbot ──────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatbotRequest(BaseModel):
    mensaje: str
    contextoSeccion: Optional[str] = None
    contextoDinamico: Optional[str] = None
    historial: list[ChatMessage] = Field(default_factory=list)


class ChatbotResponse(BaseModel):
    respuesta: str
    rutaNavegacion: Optional[str] = None


# ── ML Analysis ──────────────────────────────────────────────────
class Finding(BaseModel):
    type: str
    severity: str
    nodeId: Optional[str] = ""
    message: str
    suggestion: str


class AnalysisRequest(BaseModel):
    politicaId: str
    registrosCompletados: list[dict] = Field(default_factory=list)
    tenantId: Optional[str] = None


class AnalysisResponse(BaseModel):
    findings: list[Finding] = Field(default_factory=list)


# ── Insights (Fase 3) ────────────────────────────────────────────
class BottleneckInfo(BaseModel):
    actividadId: str
    actividadNombre: str
    promedioMinutos: float
    desviacionSobre: float
    severity: str
    numEjecuciones: int


class Prediccion(BaseModel):
    duracionEstimadaDias: float
    confianza: float
    factoresRelevantes: list[str]


class Metrica(BaseModel):
    totalRegistros: int
    duracionPromedioMinutos: float
    desviacionEstandar: float
    tasaCompletitud: float


class InsightsResponse(BaseModel):
    politicaId: Optional[str]
    generadoEn: str
    metricas: Metrica
    cuellosBottella: list[BottleneckInfo]
    prediccion: Prediccion
    insightsNaturales: str
    alertas: list[dict]


# ── Móvil AI (Fase 3.2) ──────────────────────────────────────────
class VoiceRouterResponse(BaseModel):
    politicaId: str
    intencionDetectada: str
    confianza: float


# ── Nuevos Modelos Fase 3.x ──────────────────────────────────────
class AiAssignRequest(BaseModel):
    prompt: str
    available_workflows: list


class NlToAggregationRequest(BaseModel):
    query: str
    politicaId: Optional[str] = None
    tenantId: Optional[str] = None
    history: Optional[List[ChatMessage]] = []


class ExportReportRequest(BaseModel):
    query: Optional[str] = None
    collection: Optional[str] = None
    pipeline: Optional[List[dict]] = None
    tenantId: Optional[str] = None
    politicaId: Optional[str] = None
    format: str  # "pdf", "xlsx", "docx"
    chartImage: Optional[str] = None



class CompilarPdfRequest(BaseModel):
    htmlContent: str
    fileName: str


class PredictRouteRequest(BaseModel):
    hora_del_dia: int
    dia_de_semana: int
    departamento_id: str
    politica_id: str
    carga_actual: int
    historial_cliente: float


class PredictRouteResponse(BaseModel):
    rutaSugerida: str
    tiempoEstimadoMinutos: float
    prioridadRecomendada: str
    isAnomalo: bool
    scoreEficiencia: float



# ═══════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════

CHATBOT_SYSTEM_PROMPT = """Eres BPM-Guía, el asistente experto y navegador del sistema BPM Inteligente.
Tu objetivo es ayudar al usuario y, si es posible, LLEVARLO al lugar correcto del sistema.

REGLAS DE RESPUESTA:
1. Responde de forma concisa, clara y en español. Usa Markdown ligero (negritas con **, listas con *).
2. Sé específico: di EXACTAMENTE qué botón presionar y dónde.
3. Usa los datos del sistema cuando estén disponibles para personalizar la respuesta.
4. NO repitas la misma respuesta genérica. Adapta según el contexto.
5. VALIDA EL ROL DEL USUARIO: En el contexto se te proveerá el rol del usuario (ej: Funcionario, Administrador, Diseñador). Si el usuario pide ir al diseñador de políticas o a la configuración, pero su rol no tiene los permisos lógicos, indícale amablemente que no tiene autorización y NO emitas la ruta de navegación.

RUTAS DE NAVEGACIÓN DISPONIBLES (Úsalas exactamente así):
- '/admin?tab=analytics': Dashboard de Analytics ML, predicciones de IA y cuellos de botella.
- '/admin?tab=monitor': Monitor de procesos en tiempo real.
- '/admin?tab=usuarios': Gestión de Colaboradores/Usuarios internos.
- '/admin?tab=clientes': Gestión de Clientes externos (NO es lo mismo que usuarios).
- '/admin?tab=departamentos': Estructura de Departamentos.
- '/admin?tab=cargos': Gestión de Cargos institucionales.
- '/admin?tab=tenants': Datos de la Empresa/Tenant.
- '/admin?tab=audit': Auditoría del sistema.
- '/admin?tab=formularios': Repositorio de Formularios.
- '/designer': Hub de Proyectos y nuevas políticas (Requiere rol Diseñador o Admin).
- '/designer/editor': Editor gráfico de flujos.
- '/funcionario?tab=bandeja': Bandeja de tareas pendientes del usuario.
- '/funcionario?tab=disponible': Mercado de tareas disponibles para tomar.
- '/funcionario?tab=historial': Mi Historial personal de tareas realizadas.
- '/funcionario?tab=iniciar': Iniciar un nuevo trámite.
- '/tracking': Seguimiento de trámites.

BOTONES DE ACCIÓN DISPONIBLES (Para invocar modales, usa EXACTAMENTE la ruta indicada en el JSON):
- Pestaña 'Usuarios': Botón '+ Nuevo Usuario' (ruta: '/admin?tab=usuarios&action=new')
- Pestaña 'Clientes': Botón '+ Nuevo Cliente' (ruta: '/admin?tab=clientes&action=new')
- Pestaña 'Empresa': Botón 'Editar Perfil Institucional' (ruta: '/admin?tab=tenants&action=edit')
- Pestaña 'Departamentos': Botón '+ Nuevo Departamento' (ruta: '/admin?tab=departamentos&action=new')
- Pestaña 'Cargos': Botón '+ Nuevo Cargo' (ruta: '/admin?tab=cargos&action=new')
- Pestaña 'Formularios': Botón '+ Crear Formulario' (ruta: '/admin?tab=formularios')
- Designer Hub: Botón '+ Nuevo Proyecto' (ruta: '/designer')
- Funcionario: Botones 'Tomar Tarea', 'Completar Tarea', 'Iniciar Nuevo Proceso' (ruta: '/funcionario')

INSTRUCCIÓN CRÍTICA PARA EL FINAL DE TU RESPUESTA:
Después de tu respuesta textual, DEBES incluir EN LA ÚLTIMA LÍNEA un bloque JSON oculto con este formato exacto:
<!--NAV:{"rutaNavegacion": "/ruta/aqui", "acciones": [{"label": "Texto botón", "ruta": "/ruta"}]}-->
Si no hay navegación o no tiene acceso, usa: <!--NAV:{"rutaNavegacion": null, "acciones": []}-->
SIEMPRE incluye este bloque al final, es obligatorio."""

ASSISTANT_SYSTEM_PROMPT = """Eres 'Antigravity AI', un arquitecto de procesos BPM avanzado. Tu objetivo es ayudar al usuario a diseñar flujos de trabajo profesionales sin que tenga que usar las manos.

INSTRUCCIONES CRÍTICAS:
1. DEBES responder UNICAMENTE con un JSON válido. Sin preámbulos ni explicaciones fuera del JSON.
2. CIRUGÍA VS CREACIÓN: Si el usuario menciona un objeto que YA existe en el contexto (mira la lista de nodos abajo), NO uses CREAR_NODO. Usa MOVER_NODO, MODIFICAR_NODO o CAMBIAR_ESTILO.
3. Sé "creativo" (crear flujos completos) SOLO si el usuario pide algo nuevo o abstracto como "Crea un proceso de ventas". Si pide algo específico sobre lo que ya hay (ej: "mueve gato"), sé quirúrgico: solo mueve el nodo existente.
4. Usa nombres de actividades claros y orientados a la acción.
5. Para procesos nuevos, genera una LISTA de acciones en orden lógico.
6. Si la acción no es posible, responde en 'explicacion' y usa 'NOT_SUPPORTED'.

ESTRUCTURA DEL JSON:
{
  "explicacion": "Un mensaje empoderador y técnico de lo que vas a construir",
  "acciones": [
     { "tipo": "CREAR_CALLE", "params": { "nombre": "RRHH", "color": "#6366f1" } },
     { "tipo": "CREAR_NODO", "params": { "tipo": "TAREA", "nombre": "Entrevista Técnica", "calleNombre": "RRHH" } },
     { "tipo": "CONECTAR_NODOS", "params": { "origenNombre": "Inicio", "destinoNombre": "Entrevista Técnica" } },
     { "tipo": "ASIGNAR_PLANTILLA", "params": { "nombreNodo": "Entrevista Técnica", "nombrePlantilla": "Formulario Contratación" } }
  ]
}

ACCIONES SOPORTADAS:
- CREAR_CALLE (nombre, color)
- CREAR_NODO (tipo: INICIO|FIN|TAREA|DECISION|FORK|JOIN, nombre, calleNombre)
- ELIMINAR_NODO (nombre)
- CONECTAR_NODOS (origenNombre, destinoNombre)
- MODIFICAR_NODO (nombreActual, nuevoNombre)
- ELIMINAR_CALLE (nombre)
- MOVER_NODO (nombreNodo, nuevaCalleNombre)
- CAMBIAR_ESTILO (nombre, color, ancho, alto, fontSize: sm|md|lg)
- ASIGNAR_PLANTILLA (nombreNodo, nombrePlantilla)
- RENOMBRAR_CALLE (nombreActual, nuevoNombre)
- ELIMINAR_TRANSICION (origenNombre, destinoNombre)
- REORDENAR_CALLES (nombresOrdenados: array de strings)
- EDITAR_TRANSICION (origenNombre, destinoNombre, etiqueta, condicion, color, tipoLinea: solida|punteada|lineas, grosor)
- NOT_SUPPORTED (razon)"""

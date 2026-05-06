"""
═══════════════════════════════════════════════════════════════════
  BPM Inteligente — AI Microservice (FastAPI)
  Fase 2: Groq Real + Streaming SSE + RAG Contextual
═══════════════════════════════════════════════════════════════════
"""

import os
import json
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional
from groq import Groq
from elevenlabs import ElevenLabs

# ── Cargar variables de entorno ──────────────────────────────────
load_dotenv(override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
API_SECRET = os.getenv("AI_API_SECRET", "dev_secret_local_only")

# ── Inicializar clientes ────────────────────────────────────────
app = FastAPI(
    title="BPM Inteligente — AI Microservice",
    description="Microservicio de IA/ML con Groq, Streaming SSE y RAG contextual.",
    version="2.0.0",
)

groq_client: Groq | None = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)

el_client: ElevenLabs | None = None
if ELEVENLABS_API_KEY and ELEVENLABS_API_KEY != "your_key_here":
    el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# ── CORS ─────────────────────────────────────────────────────────
_cors_origins = [
    "http://localhost:4200",
    "http://localhost:8080",
]
# Agregar orígenes de producción si están configurados
for env_key in ("CORS_ORIGIN", "BACKEND_ORIGIN"):
    val = os.getenv(env_key, "")
    if val:
        _cors_origins.append(val)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Seguridad inter-servicios ────────────────────────────────────
@app.middleware("http")
async def validate_api_secret(request: Request, call_next):
    # Permitir health check y CORS preflight sin secreto
    if request.url.path == "/" or request.method == "OPTIONS":
        return await call_next(request)

    # En desarrollo local, si el secreto es el default, permitir todo
    if API_SECRET == "dev_secret_local_only":
        return await call_next(request)

    # En producción, validar el header X-API-Secret
    secret = request.headers.get("X-API-Secret", "")
    if secret != API_SECRET:
        return JSONResponse(status_code=403, content={"detail": "Forbidden: invalid API secret"})

    return await call_next(request)


# ═══════════════════════════════════════════════════════════════════
# MODELOS PYDANTIC
# ═══════════════════════════════════════════════════════════════════

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


from ml_service import ejecutar_pipeline_completo

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


# ═══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.get("/")
async def health_check():
    return {
        "service": "BPM Inteligente — AI Microservice",
        "status": "running",
        "version": "2.0.0",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


# ── 1. Asistente IA (Designer) — JSON Síncrono ──────────────────
@app.post("/api/ai/assistant/prompt", response_model=AiActionResponse)
async def assistant_prompt(request: AiCommandRequest):
    """
    Procesa instrucciones del diseñador BPM usando Groq.
    Retorna JSON estructurado con acciones para el canvas.
    NO usa streaming (el frontend necesita el JSON completo).
    """
    if not groq_client:
        return AiActionResponse(
            explicacion="API Key de Groq no configurada. Configura GROQ_API_KEY en el archivo .env del microservicio.",
            acciones=[AiAction(tipo="NOT_SUPPORTED", params={"razon": "GROQ_API_KEY no configurada en el microservicio Python."})],
        )

    try:
        # Construir contexto del diagrama si existe
        context_str = ""
        if request.contexto:
            context_str = f"\n\nContexto del diagrama actual: {json.dumps(request.contexto, ensure_ascii=False, default=str)}"

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": ASSISTANT_SYSTEM_PROMPT + context_str},
                {"role": "user", "content": request.instruccion},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=1024,
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)

        return AiActionResponse(
            explicacion=parsed.get("explicacion", "Procesado correctamente."),
            acciones=[AiAction(**a) for a in parsed.get("acciones", [])],
        )

    except json.JSONDecodeError as e:
        return AiActionResponse(
            explicacion=f"Error al parsear la respuesta del LLM: {str(e)}",
            acciones=[AiAction(tipo="NOT_SUPPORTED", params={"razon": "Respuesta del LLM no fue JSON válido."})],
        )
    except Exception as e:
        return AiActionResponse(
            explicacion=f"Error al procesar con Groq: {str(e)}",
            acciones=[AiAction(tipo="NOT_SUPPORTED", params={"razon": str(e)})],
        )


# ── 2. Chatbot — Streaming SSE ───────────────────────────────────
@app.post("/api/ai/chatbot/chat")
async def chatbot_chat(request: ChatbotRequest):
    """
    Chatbot conversacional con streaming SSE.
    Inyecta el contexto dinámico de Java como pseudo-RAG.
    Retorna Server-Sent Events con chunks de texto.
    """
    # Fallback sin streaming si no hay Groq
    if not groq_client:
        return ChatbotResponse(
            respuesta="API Key de Groq no configurada. Configura GROQ_API_KEY en el microservicio Python para activar el chatbot inteligente.",
            rutaNavegacion=None,
        )

    # Construir mensajes para Groq
    system_content = CHATBOT_SYSTEM_PROMPT
    if request.contextoDinamico:
        system_content += f"\n\n{request.contextoDinamico}"
    if request.contextoSeccion:
        system_content += f"\n\nEl usuario está actualmente en la sección: {request.contextoSeccion}"

    messages = [{"role": "system", "content": system_content}]

    # Añadir historial conversacional
    for msg in request.historial:
        messages.append({"role": msg.role, "content": msg.content})

    # Añadir mensaje actual
    messages.append({"role": "user", "content": request.mensaje})

    async def generate_stream():
        """Generador SSE que lee el stream de Groq y emite chunks."""
        full_response = ""
        try:
            stream = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=2048,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    text = delta.content
                    full_response += text
                    # Emitir chunk como SSE
                    sse_data = json.dumps({"text": text}, ensure_ascii=False)
                    yield f"data: {sse_data}\n\n"

            # Parsear navegación y acciones del bloque <!--NAV:...--> al final
            ruta_navegacion = None
            acciones = []
            visible_text = full_response

            if "<!--NAV:" in full_response:
                parts = full_response.split("<!--NAV:")
                visible_text = parts[0].strip()
                try:
                    nav_json_str = parts[1].rstrip("-->").rstrip("-").rstrip(">").strip()
                    if nav_json_str.endswith("-->"):
                        nav_json_str = nav_json_str[:-3]
                    nav_data = json.loads(nav_json_str)
                    ruta_navegacion = nav_data.get("rutaNavegacion")
                    acciones = nav_data.get("acciones", [])
                except (json.JSONDecodeError, IndexError):
                    pass

            # Evento final con metadata
            done_data = json.dumps({
                "done": True,
                "rutaNavegacion": ruta_navegacion,
                "acciones": acciones,
                "fullText": visible_text,
            }, ensure_ascii=False)
            yield f"data: {done_data}\n\n"

        except Exception as e:
            error_data = json.dumps({
                "done": True,
                "error": str(e),
                "rutaNavegacion": None,
                "acciones": [],
                "fullText": f"Error al procesar con Groq: {str(e)}",
            }, ensure_ascii=False)
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── 3. ML Analysis & Insights (Fase 3) ─────────────────────────
@app.post("/api/ai/ml/analyze-bottlenecks", response_model=AnalysisResponse)
async def analyze_bottlenecks(request: AnalysisRequest):
    """
    Endpoint legacy adaptado a Fase 3.
    Llama internamente a ml_service y transforma la salida al formato antiguo
    para mantener compatibilidad con Java.
    """
    try:
        # Ejecutar pipeline completo
        resultados = await ejecutar_pipeline_completo(groq_client, request.politicaId)
        
        findings = []
        for cuello in resultados.get("cuellosBottella", []):
            findings.append(Finding(
                type="BOTTLENECK_REAL",
                severity=cuello["severity"],
                nodeId=cuello["actividadId"],
                message=f"Cuello de botella: Actividad '{cuello['actividadNombre']}' toma {cuello['promedioMinutos']} min (Desviación: {cuello['desviacionSobre']}x).",
                suggestion="Considera dividir esta tarea, asignar más personal, o automatizar pasos repetitivos."
            ))
            
        if not findings:
            findings.append(Finding(
                type="INFO", severity="INFO", nodeId="",
                message="El proceso opera dentro de parámetros normales.",
                suggestion="Continúe monitoreando."
            ))
            
        return AnalysisResponse(findings=findings)
        
    except Exception as e:
        import logging
        logging.error("Error en analyze_bottlenecks: %s", str(e))
        return AnalysisResponse(
            findings=[
                Finding(
                    type="ERROR", severity="CRITICAL", nodeId="",
                    message=f"Error en motor ML: {str(e)}",
                    suggestion="Revise los logs del microservicio."
                )
            ]
        )

@app.get("/api/ai/ml/insights", response_model=InsightsResponse)
@app.post("/api/ai/ml/insights", response_model=InsightsResponse)
async def get_insights(politicaId: Optional[str] = None):
    """
    Nuevo endpoint de Insights (Fase 3).
    Acepta GET (query param) o POST.
    Retorna el JSON completo con métricas, cuellos de botella y predicciones ML.
    """
    try:
        resultado = await ejecutar_pipeline_completo(groq_client, politicaId)
        return InsightsResponse(**resultado)
    except Exception as e:
        import logging
        logging.error("Error obteniendo insights: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import Response

@app.get("/api/ai/tts")
async def text_to_speech(text: str, voice_id: Optional[str] = None):
    """
    Convierte texto a voz usando ElevenLabs.
    Retorna el flujo de audio MPEG.
    """
    # Usar voz de env si no viene en el query param
    final_voice_id = voice_id or ELEVENLABS_VOICE_ID
    if not el_client:
        raise HTTPException(status_code=400, detail="ElevenLabs no configurado o sin API Key válida.")
    
    try:
        # Generar audio
        audio_iter = el_client.generate(
            text=text,
            voice=final_voice_id,
            model="eleven_multilingual_v2"
        )
        
        # Consumir el iterador para obtener los bytes
        audio_data = b"".join(audio_iter)
        
        return Response(content=audio_data, media_type="audio/mpeg")
    except Exception as e:
        import logging
        logging.error("Error en TTS: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error generando audio: {str(e)}")


@app.post("/api/ai/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Recibe un archivo de audio (ej. webm) y lo transcribe usando Whisper de Groq.
    """
    if not groq_client:
        raise HTTPException(status_code=400, detail="Groq no configurado.")
    
    try:
        # Groq requiere nombre de archivo con extensión reconocida
        file_name = file.filename or "audio.webm"
        file_content = await file.read()
        
        # Llamar a Whisper API
        transcription = groq_client.audio.transcriptions.create(
            file=(file_name, file_content),
            model="whisper-large-v3",
            prompt="Transcribe el siguiente audio en español.",
            response_format="text",
            language="es"
        )
        return {"text": transcription}
    except Exception as e:
        import logging
        logging.error("Error en STT Whisper: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error al procesar audio: {str(e)}")


# ═══════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA
# ═══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

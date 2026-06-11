import json
from fastapi import APIRouter, HTTPException
from app.core.config import groq_client, GROQ_MODEL
from app.schemas import (
    AiCommandRequest,
    AiActionResponse,
    AiAction,
    AiAssignRequest,
    ASSISTANT_SYSTEM_PROMPT,
)

router = APIRouter()

@router.post("/assistant/prompt", response_model=AiActionResponse)
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

@router.post("/forms/assign-workflow")
async def ai_assign_workflow(req: AiAssignRequest):
    """
    Analiza un prompt del usuario y selecciona la política de negocio más adecuada.
    """
    if not groq_client:
        raise HTTPException(status_code=400, detail="Groq no configurado.")
    
    system_prompt = f"""Eres un asistente de Inteligencia Artificial para una empresa.
Tu trabajo es escuchar/leer el problema o solicitud de un cliente y asignarle el trámite correcto.

Lista de trámites (flujos de trabajo) disponibles en la empresa:
{json.dumps(req.available_workflows, ensure_ascii=False, indent=2)}

Reglas críticas:
1. Analiza el 'prompt' del cliente.
2. Compara su necesidad con las descripciones y nombres de los trámites disponibles.
3. Si existe un trámite que resuelve su problema, devuelve su 'id' exacto.
4. Si el cliente pide algo que la empresa NO hace (ej. pedir una pizza a una compañía eléctrica), debes rechazarlo. No asignes trámites al azar.
5. Devuelve ÚNICAMENTE un JSON con esta estructura:
   {{
     "assigned_politica_id": "string o null",
     "reason": "Un mensaje breve y amable explicando tu decisión al cliente."
   }}
6. Si decides que ningún trámite aplica, assigned_politica_id debe ser null.
"""

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Solicitud del cliente: \"{req.prompt}\""},
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        import logging
        logging.error("Error en assign-workflow: %s", str(e))
        raise HTTPException(status_code=500, detail="Error en el análisis de asignación de IA.")

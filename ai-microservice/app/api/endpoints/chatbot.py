import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.core.config import groq_client, GROQ_MODEL
from app.schemas import (
    ChatbotRequest,
    ChatbotResponse,
    CHATBOT_SYSTEM_PROMPT,
)

router = APIRouter()

@router.post("/chatbot/chat")
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

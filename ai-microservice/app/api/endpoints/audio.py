import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import Optional
from app.core.config import groq_client, GROQ_MODEL, el_client, ELEVENLABS_VOICE_ID
from app.schemas import VoiceRouterResponse

router = APIRouter()

@router.get("/tts")
async def text_to_speech(text: str, voice_id: Optional[str] = None):
    """
    Convierte texto a voz usando ElevenLabs. Si ElevenLabs falla (por restricciones de IP en Cloud Run),
    realiza un fallback automático a edge-tts para mantener calidad premium sin costo.
    """
    final_voice_id = voice_id or ELEVENLABS_VOICE_ID
    
    if el_client:
        try:
            # ElevenLabs con streaming activado
            audio_iter = el_client.generate(
                text=text,
                voice=final_voice_id,
                model="eleven_multilingual_v2",
                stream=True
            )
            def el_generator():
                for chunk in audio_iter:
                    yield chunk
            return StreamingResponse(el_generator(), media_type="audio/mpeg")
        except Exception as e:
            import logging
            logging.error("Error en TTS ElevenLabs (fallback a edge-tts): %s", str(e))
            
    # --- FALLBACK A EDGE-TTS (Voz neuronal de Microsoft, alta calidad y gratis) ---
    try:
        import edge_tts
        voice = "es-ES-ElviraNeural" 
        communicate = edge_tts.Communicate(text, voice)
        
        async def edge_generator():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
                
        return StreamingResponse(edge_generator(), media_type="audio/mpeg")
    except Exception as e:
        import logging
        logging.error("Error en TTS Edge: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error generando audio: {str(e)}")


@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Recibe un archivo de audio (ej. webm) y lo transcribe usando Whisper de Groq.
    """
    if not groq_client:
        raise HTTPException(status_code=400, detail="Groq no configurado.")
    
    try:
        file_name = file.filename or "audio.webm"
        file_content = await file.read()
        
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


@router.post("/mobile/voice-router", response_model=VoiceRouterResponse)
async def mobile_voice_router(file: UploadFile = File(...)):
    """
    Recibe un audio del celular, transcribe con Whisper (Groq)
    y usa Llama 3 para inferir el 'politicaId' más adecuado del catálogo.
    """
    if not groq_client:
        raise HTTPException(status_code=400, detail="Groq no configurado.")
    
    try:
        file_name = file.filename or "voice_query.m4a"
        file_content = await file.read()
        
        transcription = groq_client.audio.transcriptions.create(
            file=(file_name, file_content),
            model="whisper-large-v3",
            prompt="Transcribe el siguiente audio de un cliente de la cooperativa en español latino.",
            response_format="text",
            language="es"
        )
        
        catalogo_politicas = [
            {"id": "POL-100", "nombre": "Mantenimiento Urgente", "desc": "Cortocircuitos, chispas, postes caídos o sin luz."},
            {"id": "POL-200", "nombre": "Instalación de Nuevo Medidor", "desc": "Clientes que desean conexión nueva."},
            {"id": "POL-300", "nombre": "Reclamo de Facturación", "desc": "Facturas elevadas, lectura errónea o dudas de cobro."}
        ]
        
        system_prompt = f"""Eres el cerebro enrutador del sistema BPM Inteligente.
Analiza la siguiente transcripción de un cliente e infiere la intención.
Compara la intención contra este catálogo de trámites disponibles:
{json.dumps(catalogo_politicas, ensure_ascii=False)}

RESPONDE ÚNICAMENTE CON UN JSON EN ESTE FORMATO ESTRICTO:
{{"politicaId": "AQUÍ_EL_ID", "intencionDetectada": "Breve descripción", "confianza": 0.99}}
Si no tiene sentido con ninguna, usa "politicaId": "UNKNOWN".
"""

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcription},
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return VoiceRouterResponse(
            politicaId=result.get("politicaId", "UNKNOWN"),
            intencionDetectada=result.get("intencionDetectada", "Trámite General"),
            confianza=float(result.get("confianza", 0.5))
        )
        
    except Exception as e:
        import logging
        logging.error("Error NLP Voice Router: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error analizando voz: {str(e)}")


@router.post("/forms/voice-fill")
async def voice_fill_form(
    file: UploadFile = File(...),
    fields: str = Form(...),  # JSON string of fields metadata
    local_transcription: str = Form(None)
):
    """
    Recibe un audio de dictado de voz, lo transcribe usando Whisper,
    y usa Groq NLP para extraer estructuradamente la información de los campos del formulario.
    """
    if not groq_client:
        raise HTTPException(status_code=400, detail="Groq no configurado.")
    
    try:
        file_name = file.filename or "form_voice.webm"
        file_content = await file.read()
        
        transcription = ""
        try:
            if file_content and len(file_content) > 0:
                transcription = groq_client.audio.transcriptions.create(
                    file=(file_name, file_content),
                    model="whisper-large-v3",
                    prompt="Transcribe el siguiente audio en español donde un usuario describe datos de un formulario de inspección o trámite.",
                    response_format="text",
                    language="es",
                    temperature=0.0
                )
        except Exception as whisper_err:
            import logging
            logging.warning("Fallo en la transcripción de Groq Whisper: %s. Intentando usar transcripción local.", str(whisper_err))
            if not local_transcription or not local_transcription.strip():
                raise whisper_err
        
        if not transcription or not transcription.strip():
            if local_transcription and local_transcription.strip():
                transcription = local_transcription
            else:
                raise HTTPException(status_code=400, detail="No se pudo obtener la transcripción del audio y tampoco se proveyó una transcripción local.")
        
        try:
            fields_schema = json.loads(fields)
        except Exception:
            raise HTTPException(status_code=400, detail="El campo 'fields' debe ser un JSON válido.")
        
        system_prompt = f"""Eres un motor de extracción de datos por inteligencia artificial de alta precisión.
Tu trabajo es procesar la siguiente transcripción de voz de un usuario y rellenar un formulario estructurado.

Esquema del formulario (Lista de campos a rellenar):
{json.dumps(fields_schema, ensure_ascii=False, indent=2)}

Reglas de extracción:
1. Extrae únicamente los valores solicitados en el esquema.
2. Cada campo en el esquema tiene un 'name' (nombre de la variable) y un 'type' (tipo de dato, ej: number, string, boolean).
3. Asegúrate de convertir los valores al tipo de dato correcto. Si es boolean, responde true/false. Si es number, responde con el número correspondiente.
4. Si un valor no se menciona o no se puede inferir con certeza, usa null.
5. Devuelve ÚNICAMENTE un objeto JSON plano donde las claves sean los 'name' del esquema y los valores sean los datos extraídos.
6. NO incluyas ninguna explicación, texto adicional, ni bloques de código de markdown. Solo el JSON plano.
7. CRÍTICO: Si un campo tiene una lista de 'options', el valor extraído DEBE ser EXACTAMENTE una de esas opciones. Si el usuario usa un sinónimo (ej: dice "positiva" y las opciones son ["Aprobado", "Rechazado"]), infiere y mapea a la opción correcta ("Aprobado"). NUNCA devuelvas un valor que no esté en la lista de options si esta existe.
"""

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Transcripción del usuario: \"{transcription}\""},
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        
        extracted_values = json.loads(response.choices[0].message.content)
        
        return {
            "transcription": transcription,
            "values": extracted_values
        }
        
    except Exception as e:
        import logging
        logging.error("Error en voice-fill: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error en auto-llenado por voz: {str(e)}")

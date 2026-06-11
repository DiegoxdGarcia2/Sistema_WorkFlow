"""
═══════════════════════════════════════════════════════════════════
  BPM Inteligente — AI Microservice (FastAPI)
  Fase 3: Refactorización Modular del Monolito
═══════════════════════════════════════════════════════════════════
"""

import os
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.config import API_SECRET, GROQ_API_KEY, GROQ_MODEL
import app.core.config as config

# Importar routers modulares
from app.api.endpoints.assistant import router as assistant_router
from app.api.endpoints.chatbot import router as chatbot_router
from app.api.endpoints.ml import router as ml_router
from app.api.endpoints.audio import router as audio_router

app = FastAPI(
    title="BPM Inteligente — AI Microservice",
    description="Microservicio de IA/ML modular con Groq, Streaming SSE y RAG.",
    version="3.0.0",
)

# Registrar routers modulares
app.include_router(assistant_router, prefix="/api/ai")
app.include_router(chatbot_router, prefix="/api/ai")
app.include_router(ml_router, prefix="/api/ai")
app.include_router(audio_router, prefix="/api/ai")

# ── CORS ─────────────────────────────────────────────────────────
_cors_origins = [
    "http://localhost:4200",
    "http://localhost:8080",
]
for env_key in ("CORS_ORIGIN", "BACKEND_ORIGIN"):
    val = os.getenv(env_key, "")
    if val:
        _cors_origins.append(val)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.run\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Seguridad inter-servicios ────────────────────────────────────
@app.middleware("http")
async def validate_api_secret(request: Request, call_next):
    if request.url.path == "/" or request.method == "OPTIONS":
        return await call_next(request)

    if API_SECRET == "dev_secret_local_only":
        return await call_next(request)

    secret = request.headers.get("X-API-Secret", "")
    if secret != API_SECRET:
        return JSONResponse(status_code=403, content={"detail": "Forbidden: invalid API secret"})

    return await call_next(request)


# ── Health Check ─────────────────────────────────────────────────
@app.get("/")
async def health_check():
    return {
        "service": "BPM Inteligente — AI Microservice",
        "status": "running",
        "version": "3.0.0",
        "groq_configured": bool(GROQ_API_KEY),
        "model": GROQ_MODEL,
    }


# ── Compilación de PDF (Documentos) ──────────────────────────────
class CompilarPdfRequest(BaseModel):
    contenido_html: str

@app.post("/api/ai/documentos/compilar-pdf")
async def compilar_pdf(req: CompilarPdfRequest):
    try:
        from pdf_compiler import compilar_html_a_pdf
        pdf_bytes = compilar_html_a_pdf(req.contenido_html)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=documento.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        import logging
        logging.exception("Error en compilar-pdf")
        raise HTTPException(status_code=500, detail=f"Error en compilación: {str(e)}")


# ── ONNX Runtime Models (Fase 5 Startup Loader) ───────────────────
@app.on_event("startup")
async def load_tf_models():
    import logging
    try:
        import onnxruntime as ort
        import pickle
        import os
        
        models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        routing_path = os.path.join(models_dir, "routing_multi_output.onnx")
        anomaly_path = os.path.join(models_dir, "anomaly_autoencoder.onnx")
        prep_path = os.path.join(models_dir, "preprocessing_pipeline.pkl")
        
        if os.path.exists(routing_path) and os.path.exists(anomaly_path) and os.path.exists(prep_path):
            sess_opts = ort.SessionOptions()
            sess_opts.intra_op_num_threads = 1
            sess_opts.inter_op_num_threads = 1
            
            config.ort_routing_session = ort.InferenceSession(routing_path, sess_opts)
            config.ort_anomaly_session = ort.InferenceSession(anomaly_path, sess_opts)
            
            config.ort_routing_input_name = config.ort_routing_session.get_inputs()[0].name
            config.ort_anomaly_input_name = config.ort_anomaly_session.get_inputs()[0].name
            
            with open(prep_path, "rb") as f:
                config.tf_preprocessing = pickle.load(f)
            logging.info("✅ ONNX Models Loaded Successfully with ONNX Runtime.")
        else:
            logging.warning("⚠️ ONNX Models not found. Run conversion or train them first.")
    except Exception as e:
        logging.error(f"❌ Error loading ONNX models: {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

# BPM Inteligente — AI Microservice

Microservicio de Inteligencia Artificial y Machine Learning para el motor de workflows BPM Inteligente.

## Stack Tecnológico

| Tecnología    | Uso                              |
|---------------|----------------------------------|
| FastAPI       | Framework web async              |
| Groq          | LLM (Llama 3.3) — Asistente IA  |
| ElevenLabs    | Text-to-Speech — Fase 2         |
| LangChain     | RAG y cadenas de prompts         |
| Scikit-learn  | Modelos de ML — Fase 3          |
| Pandas        | Análisis de datos                |

## Setup Rápido

```bash
# 1. Crear entorno virtual
python -m venv .venv

# 2. Activar entorno virtual
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux/Mac:
source .venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys reales

# 5. Arrancar servidor (desarrollo)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Alternativa: ejecutar directamente
python main.py
```

## Endpoints

| Método | Ruta                             | Descripción                      |
|--------|----------------------------------|----------------------------------|
| GET    | `/`                              | Health check                     |
| POST   | `/api/ai/assistant/prompt`       | Asistente IA del Designer        |
| POST   | `/api/ai/chatbot/chat`           | Chatbot conversacional           |
| POST   | `/api/ai/ml/analyze-bottlenecks` | Análisis ML de cuellos de botella|

## Documentación Interactiva

Una vez levantado el servidor, accede a:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Arquitectura

```
Spring Boot (:8080)  ──HTTP──>  FastAPI (:8000)  ──>  Groq / Scikit-learn
     │                                                       │
     └── Angular (:4200) <───────────────────────────────────┘
```

Spring Boot actúa como API Gateway: recibe las peticiones del frontend, enriquece con contexto de la base de datos, y delega el procesamiento de IA a este microservicio.

import os
from dotenv import load_dotenv
from groq import Groq
from elevenlabs import ElevenLabs

load_dotenv(override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
API_SECRET = os.getenv("AI_API_SECRET", "dev_secret_local_only")

groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception:
        pass

el_client = None
if ELEVENLABS_API_KEY and ELEVENLABS_API_KEY != "your_key_here":
    try:
        el_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    except Exception:
        pass

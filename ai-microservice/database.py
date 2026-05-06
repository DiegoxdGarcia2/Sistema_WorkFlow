"""
database.py — Conexión directa a MongoDB Atlas desde el microservicio Python.

ARQUITECTURA (Fase 3):
- Python accede directamente a MongoDB para leer datos históricos masivos.
- Esto evita el anti-patrón de serializar miles de registros vía HTTP desde Java.
- Patrón Singleton: una sola conexión MongoClient reutilizada en todo el proceso.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ConfigurationError

load_dotenv()

log = logging.getLogger(__name__)

# ── Singleton ─────────────────────────────────────────────────────
_client: Optional[MongoClient] = None
_db: Optional[Database] = None

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/bpm_inteligente")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "bpm_inteligente")


def get_db() -> Optional[Database]:
    """
    Devuelve la instancia de la base de datos MongoDB.
    Inicializa la conexión la primera vez (lazy singleton).
    Retorna None si la conexión falla (el servicio degrada gracefully).
    """
    global _client, _db

    if _db is not None:
        return _db

    try:
        log.info("Inicializando conexión a MongoDB: %s (DB: %s)", MONGO_URI[:50] + "...", MONGO_DB_NAME)
        _client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,   # 5s timeout para no bloquear el startup
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
        )
        # Verificar que la conexión es válida
        _client.admin.command("ping")
        _db = _client[MONGO_DB_NAME]
        log.info("✅ Conexión a MongoDB establecida exitosamente. DB: %s", MONGO_DB_NAME)
        return _db

    except (ConnectionFailure, ConfigurationError) as e:
        log.warning("⚠️  No se pudo conectar a MongoDB: %s. El análisis ML no estará disponible.", str(e))
        _client = None
        _db = None
        return None
    except Exception as e:
        log.error("❌ Error inesperado al conectar a MongoDB: %s", str(e))
        _client = None
        _db = None
        return None


def get_collection(name: str) -> Optional[Collection]:
    """Helper: devuelve una colección por nombre, o None si no hay conexión."""
    db = get_db()
    if db is None:
        return None
    return db[name]


def close_connection():
    """Cierra la conexión MongoDB limpiamente (útil al apagar el servidor)."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        log.info("Conexión a MongoDB cerrada.")

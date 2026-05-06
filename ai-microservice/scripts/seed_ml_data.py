"""
seed_ml_data.py — Simulador Corporativo de Datos Históricos para ML
═══════════════════════════════════════════════════════════════════

Genera ~1000+ registros de actividades simulando dos procesos corporativos reales:
  1. "Instalación de Medidor Eléctrico" (CRE - Cooperativa Eléctrica)
  2. "Aprobación de Crédito Personal" (Banco Nacional de Desarrollo)

ANOMALÍAS MATEMÁTICAS INTENCIONALES:
  - Legal/Riesgos: 4x más lento que el promedio → CRITICAL bottleneck
  - Atención/Ventanilla: 2x más lento (spike 20%) → WARNING bottleneck
  - Trámites después de las 14:00: 1.5x más lentos → Feature temporal para RF

Ejecutar: cd ai-microservice && python scripts/seed_ml_data.py
"""

import os
import sys
import random
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# ── Cargar .env del directorio padre ──────────────────────────────
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(parent_dir, '.env'))

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "bpm_inteligente")

if not MONGO_URI:
    print("❌ Error: MONGO_URI no encontrada en .env")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["registro_actividades"]

# ═══════════════════════════════════════════════════════════════════
# CONFIGURACIÓN DE PROCESOS
# ═══════════════════════════════════════════════════════════════════

# IDs reales de las políticas LIVE en la BD
POLITICA_CRE = "88dd3ebc-8f37-4124-a1ce-6ecc8e401cee"         # Instalación de Medidor
POLITICA_BANCO = "2b5f0bd0-345a-45e1-9f6a-36c521359c64"       # Aprobación de Crédito

# ── Proceso 1: Instalación de Medidor Eléctrico (CRE) ────────────
PROCESO_CRE = {
    "nombre": "Instalación de Medidor Eléctrico",
    "politicaId": POLITICA_CRE,
    "actividades": [
        # (id, nombre, departamento, base_min, std_dev)
        ("cre_1", "Recepción de Solicitud",        "Atención",     15,  3),
        ("cre_2", "Verificación Documental",        "Operaciones",  25,  5),
        ("cre_3", "Revisión Legal del Predio",      "Legal",       240, 40),  # ⚠️ BOTTLENECK CRITICAL: 4x
        ("cre_4", "Inspección Técnica en Campo",    "IT",           45, 10),
        ("cre_5", "Aprobación de Presupuesto",      "Gerencia",     30,  8),
        ("cre_6", "Instalación Física del Medidor", "Operaciones",  60, 15),
        ("cre_7", "Registro en Sistema Comercial",  "Atención",     20,  4),
    ]
}

# ── Proceso 2: Aprobación de Crédito Personal (Banco) ────────────
PROCESO_BANCO = {
    "nombre": "Aprobación de Crédito Personal",
    "politicaId": POLITICA_BANCO,
    "actividades": [
        ("bnk_1", "Recepción de Solicitud de Crédito", "Comercial",   20,  4),
        ("bnk_2", "Verificación de Identidad",          "Comercial",   15,  3),
        ("bnk_3", "Evaluación de Riesgo Crediticio",    "Riesgos",    200, 35),  # ⚠️ BOTTLENECK CRITICAL: 4x
        ("bnk_4", "Validación de Garantías",            "Riesgos",    180, 30),  # ⚠️ BOTTLENECK CRITICAL: 4x
        ("bnk_5", "Aprobación del Comité de Crédito",   "Gerencia",    40, 10),
        ("bnk_6", "Firma de Contrato",                  "Comercial",   35,  8),
        ("bnk_7", "Desembolso de Fondos",               "Comercial",   10,  2),
    ]
}


# ═══════════════════════════════════════════════════════════════════
# GENERADOR
# ═══════════════════════════════════════════════════════════════════

def generar_registros(proceso: dict, num_tramites: int, base_date: datetime) -> list:
    """Genera registros históricos para un proceso dado."""
    registros = []

    for t in range(1, num_tramites + 1):
        tramite_id = f"tramite_{proceso['politicaId'][:8]}_{t}"
        
        # Variar la hora de inicio: 50% mañana (8-13h), 50% tarde (14-18h)
        hora_inicio = random.choice(range(8, 14)) if random.random() < 0.5 else random.choice(range(14, 19))
        current_time = base_date + timedelta(
            days=random.randint(0, 89),  # Distribuir en 90 días
            hours=hora_inicio,
            minutes=random.randint(0, 59)
        )

        # Factor temporal: trámites de la tarde son 1.5x más lentos
        factor_tarde = 1.5 if hora_inicio >= 14 else 1.0

        for act_id, act_nombre, dept, base_min, std_dev in proceso["actividades"]:
            # Duración base con variación gaussiana
            duracion_min = max(1, random.gauss(base_min, std_dev))

            # Aplicar factor temporal
            duracion_min *= factor_tarde

            # ── Anomalía: spike aleatorio del 20% en Atención/Comercial ──
            if dept in ("Atención", "Comercial") and random.random() < 0.20:
                duracion_min += random.uniform(120, 240)  # +2 a 4 horas extra

            # ── Anomalía: Riesgos/Legal ocasionalmente AÚN PEOR ──
            if dept in ("Legal", "Riesgos") and random.random() < 0.15:
                duracion_min += random.uniform(300, 600)  # +5 a 10 horas extra

            asignado = current_time
            completado = current_time + timedelta(minutes=duracion_min)

            registros.append({
                "actividadId": act_id,
                "actividadNombre": act_nombre,
                "departamentoId": dept,
                "tramiteId": tramite_id,
                "politicaId": proceso["politicaId"],
                "estado": "HECHO",
                "asignadoEn": asignado,
                "completadoEn": completado,
                "isSeedData": True,  # Marcador para limpieza segura
            })

            # Avanzar el reloj: pausa entre actividades (5 a 90 min)
            current_time = completado + timedelta(minutes=random.randint(5, 90))

    return registros


# ═══════════════════════════════════════════════════════════════════
# EJECUCIÓN
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("═" * 60)
    print("  BPM Inteligente — Simulador Corporativo de Datos ML")
    print("═" * 60)

    # 1. Limpiar datos de semilla anteriores (NO toca datos reales)
    deleted = collection.delete_many({"isSeedData": True})
    print(f"\n🧹 Limpiados {deleted.deleted_count} registros seed anteriores.")

    # 2. Generar datos para ambos procesos
    base_date = datetime.utcnow() - timedelta(days=90)

    print(f"\n📊 Generando datos para: {PROCESO_CRE['nombre']}...")
    registros_cre = generar_registros(PROCESO_CRE, num_tramites=75, base_date=base_date)
    print(f"   → {len(registros_cre)} registros ({75} trámites × {len(PROCESO_CRE['actividades'])} actividades)")

    print(f"\n📊 Generando datos para: {PROCESO_BANCO['nombre']}...")
    registros_banco = generar_registros(PROCESO_BANCO, num_tramites=75, base_date=base_date)
    print(f"   → {len(registros_banco)} registros ({75} trámites × {len(PROCESO_BANCO['actividades'])} actividades)")

    # 3. Insertar en MongoDB
    todos = registros_cre + registros_banco
    result = collection.insert_many(todos)
    print(f"\n✅ ¡Éxito! Se insertaron {len(result.inserted_ids)} registros históricos simulados.")

    # 4. Mostrar resumen estadístico
    print("\n📈 Resumen de anomalías plantadas:")
    print("   • Legal/Riesgos: ~240 min promedio (4x el promedio global de ~50 min) → CRITICAL")
    print("   • Atención/Comercial: spike del 20% con +2-4h extra → WARNING")
    print("   • Trámites de tarde (>14h): 1.5x más lentos → Feature temporal RF")
    print(f"\n🎯 Total en colección 'registro_actividades': {collection.count_documents({})}")
    print("\n💡 Abre el Dashboard ML Analytics en el frontend para ver los resultados.")

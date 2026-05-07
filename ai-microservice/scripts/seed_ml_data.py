"""
seed_ml_data.py - Simulador Corporativo de Datos Historicos para ML
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# --- Cargar .env ---
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(parent_dir, '.env'))

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "bpm_inteligente")

if not MONGO_URI:
    print("Error: MONGO_URI no encontrada en .env")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["registros_actividad"]

# --- CONFIGURACION ---
TENANT_ID = "f68512a1-95e3-4133-9571-84147ea8e10b"

PROCESO_CRE = {
    "nombre": "Instalacion de Medidor Electrico",
    "politicaId": "88dd3ebc-8f37-4124-a1ce-6ecc8e401cee",
    "tenantId": TENANT_ID,
    "actividades": [
        ("09f36993-c72f-453b-80c2-4c3b3a222af9", "Recepcion de Solicitud", "de444444-4444-4444-4444-444444444444", 15, 3),
        ("625b7022-5200-4a5a-9114-5ef0da95f596", "Inspeccion de Terreno", "de333333-3333-3333-3333-333333333333", 45, 10),
        ("ae09104b-27ff-49af-a5bb-660a161fa8db", "Evaluacion Tecnica", "de333333-3333-3333-3333-333333333333", 240, 40),
        ("aee7e856-3f7e-41f1-ba7c-7a936980ec32", "Calculo de Presupuesto", "de222222-2222-2222-2222-222222222222", 30, 8),
        ("e03ee9a7-6b84-455d-94b2-34265319a467", "Emision de Factura", "de222222-2222-2222-2222-222222222222", 20, 4),
        ("a43837e5-5111-421b-8433-59c608efd0db", "Entrega de Medidor", "de444444-4444-4444-4444-444444444444", 10, 2),
    ]
}

PROCESO_BANCO = {
    "nombre": "Aprobacion de Credito Personal",
    "politicaId": "2b5f0bd0-345a-45e1-9f6a-36c521359c64",
    "tenantId": "04bd9c22-5a50-4480-9978-dd9784b75a74",
    "actividades": [
        ("7051d789-7473-4800-8ce6-51591969e0f9", "Recepcion de Solicitud", "69ed6ed50fbd072b82a3b586", 20, 4),
        ("2ae38899-8b7d-4147-a5e6-6a82d931211f", "Verificacion Riesgo", "69ed6ed50fbd072b82a3b587", 200, 35),
        ("2e9c007b-6ea8-4581-98af-65de6d4fc33e", "Evaluacion Score", "69ed6ed50fbd072b82a3b587", 180, 30),
        ("1ab5405d-e926-45fa-acf4-944ed94d8892", "Aprobacion Comite", "69ed6ed50fbd072b82a3b587", 40, 10),
        ("e885b3a1-ca32-4f24-9180-815852ca4370", "Generacion Contrato", "69ed6ed50fbd072b82a3b586", 35, 8),
        ("1341c8ac-f257-4cde-8183-58a9c609782e", "Desembolso Fondos", "69ed6ed50fbd072b82a3b586", 15, 3),
        ("85eb3494-0740-4be7-901f-72b38112f202", "Entrega Contrato", "69ed6ed50fbd072b82a3b586", 10, 2),
    ]
}

def generar_registros(proceso, num_tramites, base_date):
    registros = []
    for t in range(1, num_tramites + 1):
        tramite_id = f"tramite_{proceso['politicaId'][:8]}_{t}"
        hora_inicio = random.choice(range(8, 14)) if random.random() < 0.5 else random.choice(range(14, 19))
        current_time = base_date + timedelta(days=random.randint(0, 89), hours=hora_inicio, minutes=random.randint(0, 59))
        factor_tarde = 1.5 if hora_inicio >= 14 else 1.0
        for act_id, act_nombre, dept_id, base_min, std_dev in proceso["actividades"]:
            duracion_min = max(1, random.gauss(base_min, std_dev)) * factor_tarde
            if random.random() < 0.15:
                duracion_min += random.uniform(100, 300)
            asignado = current_time
            completado = current_time + timedelta(minutes=duracion_min)
            registros.append({
                "tramiteId": tramite_id,
                "actividadId": act_id,
                "departamentoId": dept_id,
                "tenantId": proceso["tenantId"],
                "estado": "HECHO",
                "ejecutadoPor": "Simulador ML",
                "ejecutadoPorId": "system-sim-001",
                "asignadoEn": asignado,
                "completadoEn": completado,
                "isSeedData": True,
                "_class": "com.bpm.inteligente.domain.RegistroActividad"
            })
            current_time = completado + timedelta(minutes=random.randint(5, 60))
    return registros

if __name__ == "__main__":
    print("=" * 60)
    print("  BPM Inteligente - Seed Data Realista (registros_actividad)")
    print("=" * 60)
    deleted = collection.delete_many({"isSeedData": True})
    print(f"Limpiados {deleted.deleted_count} registros seed anteriores.")
    base_date = datetime.utcnow() - timedelta(days=90)
    reg1 = generar_registros(PROCESO_CRE, 75, base_date)
    reg2 = generar_registros(PROCESO_BANCO, 75, base_date)
    todos = reg1 + reg2
    if todos:
        collection.insert_many(todos)
        print(f"Insertados {len(todos)} registros en 'registros_actividad'.")
        print(f"Total actual: {collection.count_documents({})}")
    db["registro_actividades"].drop()
    print("Eliminada coleccion obsoleta 'registro_actividades'.")

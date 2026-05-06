import os
import sys
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

# Cargar .env de la raíz del microservicio
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(parent_dir, '.env'))

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "bpm_inteligente")

if not MONGO_URI:
    print("Error: MONGO_URI no encontrada en .env")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db["registro_actividades"]

print("Limpiando datos de semilla anteriores...")
collection.delete_many({"isSeedData": True})

# Actividades simuladas
actividades = [
    {"id": "act_1", "nombre": "Revisión Documental", "dept": "Legal", "base_min": 10, "std_dev": 2},
    {"id": "act_2", "nombre": "Aprobación Financiera", "dept": "Finanzas", "base_min": 25, "std_dev": 5},
    {"id": "act_3", "nombre": "Firma del Cliente", "dept": "Ventas", "base_min": 150, "std_dev": 40}, # CUELLO DE BOTELLA
    {"id": "act_4", "nombre": "Registro en Sistema", "dept": "Operaciones", "base_min": 5, "std_dev": 1},
]

print("Generando datos de prueba para Machine Learning...")

# Generar 30 trámites, cada uno pasa por las 4 actividades
registros = []
base_time = datetime.utcnow() - timedelta(days=30)

for t in range(1, 31):
    tramite_id = f"tramite_sim_{t}"
    current_time = base_time + timedelta(days=t, hours=random.randint(0, 8))
    
    for act in actividades:
        # Calcular duración
        duracion_min = max(1, random.gauss(act["base_min"], act["std_dev"]))
        
        # Ocasionalmente la firma del cliente se demora MUCHÍSIMO MÁS
        if act["id"] == "act_3" and random.random() < 0.2:
            duracion_min += 300 # 5 horas adicionales
            
        asignado = current_time
        completado = current_time + timedelta(minutes=duracion_min)
        
        registros.append({
            "actividadId": act["id"],
            "actividadNombre": act["nombre"],
            "departamentoId": act["dept"],
            "tramiteId": tramite_id,
            "estado": "HECHO",
            "asignadoEn": asignado,
            "completadoEn": completado,
            "isSeedData": True # Marcarlo para poder borrarlo
        })
        
        current_time = completado + timedelta(minutes=random.randint(5, 60))

# Insertar en MongoDB
result = collection.insert_many(registros)
print(f"Exito! Se insertaron {len(result.inserted_ids)} registros historicos simulados.")
print("Ahora puedes recargar el Dashboard de ML Analytics en tu frontend.")

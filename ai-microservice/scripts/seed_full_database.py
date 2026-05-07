"""
seed_full_database.py - Poblar BD completa simulando 1 ano de operacion.
Ejecutar: cd ai-microservice && python scripts/seed_full_database.py
"""
import os, sys
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(parent_dir, '.env'))
sys.path.insert(0, os.path.join(parent_dir, 'scripts'))

from seed_data import (
    NEW_DEPS, build_users, gen_clients, T_CRE, T_BND,
    POL_CRE_MEDIDOR, POL_CRE_RECLAMO, POL_BND_CREDITO, POL_BND_CUENTA,
    build_dept_user_map, gen_tramites_and_regs, gen_audit,
    DEP_CRE_GER, DEP_CRE_IT, DEP_CRE_OPE, DEP_CRE_ATC, DEP_BND_COM, DEP_BND_RIE
)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "bpm_inteligente")
if not MONGO_URI:
    print("Error: MONGO_URI no encontrada en .env")
    sys.exit(1)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def clean_seeds():
    """Remove previous seed data from all collections."""
    total = 0
    for col in ["departamentos","usuarios","clientes","tramites","registros_actividad","audit_log","cargos","formularios_templates"]:
        r = db[col].delete_many({"isSeedData": True})
        total += r.deleted_count
    return total

def main():
    print("=" * 60)
    print("  BPM Inteligente - Seed Completo (1 ano de operacion)")
    print("=" * 60)
    
    # 1. Clean previous seeds
    deleted = clean_seeds()
    print(f"\n[1/7] Limpiados {deleted} registros seed anteriores.")
    
    # 2. Departamentos
    if NEW_DEPS:
        db["departamentos"].insert_many(NEW_DEPS)
    print(f"[2/7] Insertados {len(NEW_DEPS)} departamentos nuevos.")
    
    # 3. Cargos nuevos
    new_cargos = [
        {"tenantId": T_CRE, "nombre": "Contador General", "codigo": "FIN-01", "salarioBase": 7500, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_CRE, "nombre": "Abogado Corporativo", "codigo": "LEG-01", "salarioBase": 9000, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_CRE, "nombre": "Jefe de RRHH", "codigo": "RRH-01", "salarioBase": 8000, "nivel": "Jefatura", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_CRE, "nombre": "Supervisor de Operaciones", "codigo": "OPE-02", "salarioBase": 7000, "nivel": "Jefatura", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_CRE, "nombre": "Asistente Administrativo", "codigo": "ADM-01", "salarioBase": 3800, "nivel": "Operativo", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_CRE, "nombre": "Ingeniero Electrico", "codigo": "TEC-02", "salarioBase": 9500, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Analista de Riesgos", "codigo": "B-RIE-01", "salarioBase": 8500, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Oficial de Creditos", "codigo": "B-COM-01", "salarioBase": 5500, "nivel": "Operativo", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Cajero Principal", "codigo": "B-OPE-01", "salarioBase": 4500, "nivel": "Operativo", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Abogado Financiero", "codigo": "B-LEG-01", "salarioBase": 10000, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Gerente de Sucursal", "codigo": "B-GER-01", "salarioBase": 12000, "nivel": "Jefatura", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
        {"tenantId": T_BND, "nombre": "Analista de Sistemas", "codigo": "B-TEC-01", "salarioBase": 8000, "nivel": "Tecnico", "_class": "com.bpm.inteligente.domain.Cargo", "isSeedData": True},
    ]
    db["cargos"].insert_many(new_cargos)
    print(f"[3/7] Insertados {len(new_cargos)} cargos nuevos.")
    
    # 4. Usuarios
    new_users = build_users()
    db["usuarios"].insert_many(new_users)
    print(f"[4/7] Insertados {len(new_users)} usuarios nuevos.")
    
    # Build user map including existing users
    all_users_cursor = db["usuarios"].find({}, {"_id":1,"nombre":1,"apellido":1,"departamentoId":1,"tenantId":1})
    all_users_list = []
    for u in all_users_cursor:
        all_users_list.append(u)
    
    dept_map = {}
    for u in all_users_list:
        did = u.get("departamentoId","")
        if did not in dept_map: dept_map[did] = []
        dept_map[did].append((u["_id"], f"{u['nombre']} {u.get('apellido','')}"))
    
    # 5. Clientes
    cre_clients = gen_clients(T_CRE, 40, 5000000)
    bnd_clients = gen_clients(T_BND, 50, 8000000)
    db["clientes"].insert_many(cre_clients + bnd_clients)
    print(f"[5/7] Insertados {len(cre_clients)+len(bnd_clients)} clientes nuevos.")
    
    # 6. Tramites + Registros
    all_tramites = []
    all_regs = []
    
    t1, r1 = gen_tramites_and_regs(POL_CRE_MEDIDOR, T_CRE, cre_clients, dept_map, 80, 12, 5)
    t2, r2 = gen_tramites_and_regs(POL_CRE_RECLAMO, T_CRE, cre_clients, dept_map, 50, 8, 3)
    t3, r3 = gen_tramites_and_regs(POL_BND_CREDITO, T_BND, bnd_clients, dept_map, 70, 10, 6)
    t4, r4 = gen_tramites_and_regs(POL_BND_CUENTA, T_BND, bnd_clients, dept_map, 40, 6, 2)
    
    all_tramites = t1+t2+t3+t4
    all_regs = r1+r2+r3+r4
    
    if all_tramites:
        db["tramites"].insert_many(all_tramites)
    if all_regs:
        db["registros_actividad"].insert_many(all_regs)
    print(f"[6/7] Insertados {len(all_tramites)} tramites y {len(all_regs)} registros de actividad.")
    
    # 7. Audit log
    audit = gen_audit(new_users)
    if audit:
        db["audit_log"].insert_many(audit)
    print(f"[7/7] Insertados {len(audit)} registros de auditoria.")
    
    # Summary
    print("\n" + "=" * 60)
    print("  RESUMEN FINAL")
    print("=" * 60)
    for col in ["tenants","departamentos","cargos","usuarios","clientes","proyectos","politicas_negocio","formularios_templates","tramites","registros_actividad","audit_log"]:
        cnt = db[col].count_documents({})
        print(f"  {col:30s} : {cnt}")
    print("=" * 60)
    print("  LISTO - Base de datos poblada con exito.")

if __name__ == "__main__":
    main()

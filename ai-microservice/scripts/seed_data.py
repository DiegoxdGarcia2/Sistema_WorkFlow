"""Datos corporativos realistas para seed."""
import uuid, random
from datetime import datetime, timedelta

# === TENANTS ===
T_CRE = "f68512a1-95e3-4133-9571-84147ea8e10b"
T_BND = "04bd9c22-5a50-4480-9978-dd9784b75a74"

# === DEPARTAMENTOS NUEVOS ===
NEW_DEPS = [
    {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Finanzas", "codigo": "DEP-FIN", "ubicacion": "P2", "presupuesto": 600000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Legal", "codigo": "DEP-LEG", "ubicacion": "P4", "presupuesto": 400000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Recursos Humanos", "codigo": "DEP-RRH", "ubicacion": "P1", "presupuesto": 350000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Operaciones Bancarias", "codigo": "B-DEP-OPE", "ubicacion": "P2", "presupuesto": 700000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Legal y Cumplimiento", "codigo": "B-DEP-LEG", "ubicacion": "P4", "presupuesto": 450000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Recursos Humanos", "codigo": "B-DEP-RRH", "ubicacion": "P1", "presupuesto": 300000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Tecnologia", "codigo": "B-DEP-TEC", "ubicacion": "P3", "presupuesto": 900000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
    {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Gerencia General", "codigo": "B-DEP-GER", "ubicacion": "P5", "presupuesto": 600000, "_class": "com.bpm.inteligente.domain.Departamento", "isSeedData": True},
]

# === EXISTING DEPARTMENT IDS ===
DEP_CRE_GER = "de111111-1111-1111-1111-111111111111"
DEP_CRE_IT = "de222222-2222-2222-2222-222222222222"
DEP_CRE_OPE = "de333333-3333-3333-3333-333333333333"
DEP_CRE_ATC = "de444444-4444-4444-4444-444444444444"
DEP_BND_COM = "69ed6ed50fbd072b82a3b586"
DEP_BND_RIE = "69ed6ed50fbd072b82a3b587"

# BCrypt hash for "admin123"
BCRYPT_HASH = "$2b$12$VF4aSDk11WZGV1VWxj6QLe.QIpckzdraCRjKD40qjaxZu6rcCMPv."

def get_dep_id(name):
    for d in NEW_DEPS:
        if d["nombre"] == name:
            return d["_id"]
    return None

# === USUARIOS NUEVOS ===
def build_users():
    return [
        # CRE users
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Fernando", "apellido": "Gutierrez", "telefono": "71234567", "cargo": "Contador General", "departamento": "Finanzas", "departamentoId": get_dep_id("Finanzas"), "email": "fernando.gutierrez@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,5,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Patricia", "apellido": "Salazar", "telefono": "72345678", "cargo": "Abogado Corporativo", "departamento": "Legal", "departamentoId": get_dep_id("Legal"), "email": "patricia.salazar@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,5,15), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Miguel", "apellido": "Torrez", "telefono": "73456789", "cargo": "Jefe de RRHH", "departamento": "Recursos Humanos", "departamentoId": get_dep_id("Recursos Humanos"), "email": "miguel.torrez@cre.com.bo", "password": BCRYPT_HASH, "rol": "ADMINISTRADOR", "activo": True, "creadoEn": datetime(2025,5,20), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Sandra", "apellido": "Rojas", "telefono": "74567890", "cargo": "Asistente Administrativo", "departamento": "Gerencia", "departamentoId": DEP_CRE_GER, "email": "sandra.rojas@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,6,1), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Andres", "apellido": "Montano", "telefono": "75678901", "cargo": "Supervisor de Operaciones", "departamento": "Operaciones", "departamentoId": DEP_CRE_OPE, "email": "andres.montano@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,6,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Daniela", "apellido": "Chavez", "telefono": "76789012", "cargo": "Ingeniero Electrico", "departamento": "Operaciones", "departamentoId": DEP_CRE_OPE, "email": "daniela.chavez@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,6,15), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Carmen", "apellido": "Espinoza", "telefono": "77890123", "cargo": "Atencion al Cliente", "departamento": "Atencion", "departamentoId": DEP_CRE_ATC, "email": "carmen.espinoza@cre.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,7,1), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_CRE, "nombre": "Ricardo", "apellido": "Pena", "telefono": "78901234", "cargo": "Analista de Sistemas", "departamento": "IT", "departamentoId": DEP_CRE_IT, "email": "ricardo.pena@cre.com.bo", "password": BCRYPT_HASH, "rol": "DISENADOR", "activo": True, "creadoEn": datetime(2025,7,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        # BND users
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Sofia", "apellido": "Mendoza", "telefono": "69123456", "cargo": "Gerente de Sucursal", "departamento": "Gerencia General", "departamentoId": get_dep_id("Gerencia General"), "email": "sofia.mendoza@bnd.com.bo", "password": BCRYPT_HASH, "rol": "ADMINISTRADOR", "activo": True, "creadoEn": datetime(2025,5,5), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Gabriel", "apellido": "Quiroga", "telefono": "69234567", "cargo": "Analista de Riesgos", "departamento": "Riesgos", "departamentoId": DEP_BND_RIE, "email": "gabriel.quiroga@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,5,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Valentina", "apellido": "Arce", "telefono": "69345678", "cargo": "Oficial de Creditos", "departamento": "Comercial", "departamentoId": DEP_BND_COM, "email": "valentina.arce@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,5,15), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Diego", "apellido": "Morales", "telefono": "69456789", "cargo": "Cajero Principal", "departamento": "Operaciones Bancarias", "departamentoId": get_dep_id("Operaciones Bancarias"), "email": "diego.morales@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,5,20), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Camila", "apellido": "Suarez", "telefono": "69567890", "cargo": "Abogado Financiero", "departamento": "Legal y Cumplimiento", "departamentoId": get_dep_id("Legal y Cumplimiento"), "email": "camila.suarez@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,6,1), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Rodrigo", "apellido": "Paz", "telefono": "69678901", "cargo": "Analista de Sistemas", "departamento": "Tecnologia", "departamentoId": get_dep_id("Tecnologia"), "email": "rodrigo.paz@bnd.com.bo", "password": BCRYPT_HASH, "rol": "DISENADOR", "activo": True, "creadoEn": datetime(2025,6,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Natalia", "apellido": "Fernandez", "telefono": "69789012", "cargo": "Oficial de Creditos", "departamento": "Comercial", "departamentoId": DEP_BND_COM, "email": "natalia.fernandez@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,6,15), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Alejandro", "apellido": "Vargas", "telefono": "69890123", "cargo": "Analista de Riesgos", "departamento": "Riesgos", "departamentoId": DEP_BND_RIE, "email": "alejandro.vargas@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,7,1), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Isabel", "apellido": "Cruz", "telefono": "69901234", "cargo": "Cajero Principal", "departamento": "Operaciones Bancarias", "departamentoId": get_dep_id("Operaciones Bancarias"), "email": "isabel.cruz@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,7,10), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
        {"_id": str(uuid.uuid4()), "tenantId": T_BND, "nombre": "Martin", "apellido": "Delgado", "telefono": "69012345", "cargo": "Jefe de RRHH", "departamento": "Recursos Humanos", "departamentoId": get_dep_id("Recursos Humanos"), "email": "martin.delgado@bnd.com.bo", "password": BCRYPT_HASH, "rol": "FUNCIONARIO", "activo": True, "creadoEn": datetime(2025,7,15), "_class": "com.bpm.inteligente.domain.Usuario", "isSeedData": True},
    ]

# === CLIENTES ===
NOMBRES = ["Jose","Maria","Pedro","Ana","Luis","Rosa","Jorge","Elena","Victor","Silvia","Oscar","Teresa","Hugo","Marta","Raul","Gloria","Marco","Lina","Edwin","Paola","Sergio","Diana","Rene","Laura","Pablo","Carla","Ivan","Monica","Felix","Norma","Alvaro","Claudia","Gonzalo","Adriana","Julio","Roxana","Nelson","Sonia","Ramiro","Cecilia"]
APELLIDOS = ["Lopez","Mamani","Quispe","Rojas","Flores","Vargas","Gutierrez","Morales","Mendoza","Castro","Torrez","Fernandez","Perez","Garcia","Montano","Chavez","Salazar","Arce","Quiroga","Suarez"]
CALLES = ["Av. Cristo Redentor","Av. Santos Dumont","Av. Banzer","Calle Junin","Av. Busch","Calle Bolivar","Av. Irala","Calle Sucre","Av. San Martin","Calle 24 de Septiembre"]

def gen_clients(tenant_id, count, ci_start):
    clients = []
    for i in range(count):
        n = random.choice(NOMBRES)
        a = random.choice(APELLIDOS)
        ci = str(ci_start + i)
        clients.append({
            "_id": str(uuid.uuid4()), "tenantId": tenant_id,
            "nombre": n, "apellido": a, "ci": ci,
            "correo": f"{n.lower()}.{a.lower()}{i}@mail.com",
            "telefono": f"7{random.randint(1000000,9999999)}",
            "direccion": f"{random.choice(CALLES)} #{random.randint(100,2500)}",
            "creadoEn": datetime(2025,5,1) + timedelta(days=random.randint(0,300)),
            "_class": "com.bpm.inteligente.domain.Cliente", "isSeedData": True
        })
    return clients

# === POLITICA -> ACTIVIDAD MAPPING (IDs reales de la BD) ===
POL_CRE_MEDIDOR = {
    "id": "88dd3ebc-8f37-4124-a1ce-6ecc8e401cee",
    "acts": [
        ("09f36993-c72f-453b-80c2-4c3b3a222af9", "de444444-4444-4444-4444-444444444444", 15, 3),
        ("625b7022-5200-4a5a-9114-5ef0da95f596", "de333333-3333-3333-3333-333333333333", 45, 10),
        ("ae09104b-27ff-49af-a5bb-660a161fa8db", "de333333-3333-3333-3333-333333333333", 240, 40),
        ("aee7e856-3f7e-41f1-ba7c-7a936980ec32", "de222222-2222-2222-2222-222222222222", 30, 8),
        ("e03ee9a7-6b84-455d-94b2-34265319a467", "de222222-2222-2222-2222-222222222222", 20, 4),
        ("a43837e5-5111-421b-8433-59c608efd0db", "de444444-4444-4444-4444-444444444444", 10, 2),
    ]
}

POL_CRE_RECLAMO = {
    "id": "b6d5d510-a37b-408c-baed-662b4d0e076c",
    "acts": [
        ("198de384-8cd4-4662-a47a-aff5ac228aca", "de333333-3333-3333-3333-333333333333", 15, 3),
        ("da83131f-559f-4e8b-9c20-23716d5138d4", "de333333-3333-3333-3333-333333333333", 60, 15),
        ("6450d930-2c3b-4343-8cc1-d5e96308ab76", "de333333-3333-3333-3333-333333333333", 45, 10),
        ("08bc7686-31c0-46bb-84a8-f5bb5a9bc6c7", "de444444-4444-4444-4444-444444444444", 10, 2),
    ]
}

POL_BND_CREDITO = {
    "id": "2b5f0bd0-345a-45e1-9f6a-36c521359c64",
    "acts": [
        ("7051d789-7473-4800-8ce6-51591969e0f9", "69ed6ed50fbd072b82a3b586", 20, 4),
        ("2ae38899-8b7d-4147-a5e6-6a82d931211f", "69ed6ed50fbd072b82a3b587", 200, 35),
        ("2e9c007b-6ea8-4581-98af-65de6d4fc33e", "69ed6ed50fbd072b82a3b587", 180, 30),
        ("1ab5405d-e926-45fa-acf4-944ed94d8892", "69ed6ed50fbd072b82a3b587", 40, 10),
        ("e885b3a1-ca32-4f24-9180-815852ca4370", "69ed6ed50fbd072b82a3b586", 35, 8),
        ("1341c8ac-f257-4cde-8183-58a9c609782e", "69ed6ed50fbd072b82a3b586", 15, 3),
        ("85eb3494-0740-4be7-901f-72b38112f202", "69ed6ed50fbd072b82a3b586", 10, 2),
    ]
}

POL_BND_CUENTA = {
    "id": "4a219358-500b-45c7-92bb-9b11772c22a5",
    "acts": [
        ("c1d828b9-930f-4ac0-bf32-0f5457b389b5", "69ed6ed50fbd072b82a3b586", 20, 4),
        ("7d80572f-cfbf-4c61-b4c0-5992fd92fff9", "69ed6ed50fbd072b82a3b587", 90, 20),
        ("c9d3a433-65a8-4b02-86ae-b533ac7fbbdd", "69ed6ed50fbd072b82a3b587", 120, 25),
        ("0c30acc9-19d4-4fec-86ce-e52199015920", "69ed6ed50fbd072b82a3b587", 30, 8),
        ("1907a4f9-c0ba-4f31-bb2c-70a3649cc617", "69ed6ed50fbd072b82a3b586", 10, 2),
    ]
}

# Map dept_id -> list of user ids for assigning work
def build_dept_user_map(users):
    m = {}
    for u in users:
        did = u.get("departamentoId","")
        if did not in m: m[did] = []
        m[did].append((u["_id"], f"{u['nombre']} {u['apellido']}"))
    return m

def gen_tramites_and_regs(pol, tenant_id, clients, users_map, count_done, count_prog, count_canc):
    tramites = []
    regs = []
    base = datetime(2025, 6, 1)
    all_counts = [("COMPLETADO", count_done), ("EN_PROGRESO", count_prog), ("CANCELADO", count_canc)]
    
    for estado, cnt in all_counts:
        for i in range(cnt):
            t_id = str(uuid.uuid4())
            cli = random.choice(clients) if clients else None
            start = base + timedelta(days=random.randint(0, 330), hours=random.randint(8,17), minutes=random.randint(0,59))
            cod = f"TR-{random.randint(100000,999999)}"
            
            t = {
                "_id": t_id, "politicaId": pol["id"], "tenantId": tenant_id,
                "estado": estado, "iniciadoEn": start, "codigoSeguimiento": cod,
                "_class": "com.bpm.inteligente.domain.Tramite", "isSeedData": True
            }
            if cli:
                t["documentoCliente"] = cli["ci"]
                t["clienteNombre"] = f"{cli['nombre']} {cli['apellido']}"
            
            cur_time = start
            acts = pol["acts"]
            acts_to_do = acts if estado == "COMPLETADO" else acts[:random.randint(1, max(1,len(acts)-1))]
            
            for j, (act_id, dept_id, base_min, std_dev) in enumerate(acts_to_do):
                dur = max(1, random.gauss(base_min, std_dev))
                if cur_time.hour >= 14: dur *= 1.5
                if cur_time.month == 12: dur *= 1.8
                if random.random() < 0.12: dur += random.uniform(80, 250)
                
                assigned = cur_time
                completed = cur_time + timedelta(minutes=dur)
                
                user_pair = ("Sistema","system")
                if dept_id in users_map and users_map[dept_id]:
                    user_pair = random.choice(users_map[dept_id])
                
                est_reg = "HECHO" if (estado == "COMPLETADO" or j < len(acts_to_do)-1) else ("EN_PROGRESO" if estado == "EN_PROGRESO" else "CANCELADO")
                
                r = {
                    "tramiteId": t_id, "actividadId": act_id, "departamentoId": dept_id,
                    "tenantId": tenant_id, "estado": est_reg,
                    "ejecutadoPor": user_pair[1] if isinstance(user_pair[1],str) and len(user_pair[1])>20 else user_pair[1],
                    "ejecutadoPorId": user_pair[0],
                    "asignadoEn": assigned, "completadoEn": completed if est_reg == "HECHO" else None,
                    "isSeedData": True, "_class": "com.bpm.inteligente.domain.RegistroActividad"
                }
                # Fix: use name not id for ejecutadoPor
                if isinstance(user_pair, tuple) and len(user_pair) == 2:
                    r["ejecutadoPor"] = user_pair[1]
                    r["ejecutadoPorId"] = user_pair[0]
                regs.append(r)
                cur_time = completed + timedelta(minutes=random.randint(5,60))
            
            if estado == "COMPLETADO":
                t["finalizadoEn"] = cur_time
            tramites.append(t)
    
    return tramites, regs

def gen_audit(users, days=365):
    logs = []
    acciones = ["LOGIN","COMPLETAR_ACTIVIDAD","CREAR_TRAMITE","MODIFICAR_POLITICA","LOGOUT","ASIGNAR_TAREA"]
    entidades = ["Tramite","RegistroActividad","PoliticaNegocio","Usuario"]
    base = datetime(2025,6,1)
    for _ in range(400):
        u = random.choice(users)
        ts = base + timedelta(days=random.randint(0,days), hours=random.randint(7,18), minutes=random.randint(0,59))
        acc = random.choice(acciones)
        logs.append({
            "_id": str(uuid.uuid4()), "tenantId": u["tenantId"],
            "usuarioId": u["_id"], "usuarioNombre": f"{u['nombre']} {u['apellido']}",
            "accion": acc, "entidad": random.choice(entidades),
            "entidadId": str(uuid.uuid4()), "detalle": f"{acc} ejecutado por {u['nombre']}",
            "timestamp": ts, "_class": "com.bpm.inteligente.domain.AuditLog", "isSeedData": True
        })
    return logs

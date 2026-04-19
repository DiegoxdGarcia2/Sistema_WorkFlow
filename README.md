# ⚡ BPM Inteligente — Motor de Workflows

Software para la Gestión y Optimización Inteligente de Procesos de Negocio mediante Inteligencia Artificial y Procesamiento de Lenguaje Natural.

---

## 📋 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | Spring Boot 3.4 + Java 17 |
| **Base de Datos** | MongoDB Atlas (cloud) |
| **Frontend** | Angular 19 + Tailwind CSS v4 |
| **Metodología** | PUDS (Jacobson, Booch, Rumbaugh) |
| **Modelado** | UML 2.5+ |

---

## 🚀 Levantar el Proyecto

### Prerrequisitos

- **Java 17+** → [Descargar](https://adoptium.net/)
- **Maven 3.8+** → [Descargar](https://maven.apache.org/download.cgi)
- **Node.js 18+** → [Descargar](https://nodejs.org/)
- **Angular CLI** → `npm install -g @angular/cli`

### 1️⃣ Levantar el Backend (Spring Boot)

Abrir una terminal en la carpeta `backend-core`:

```powershell
cd "d:\Software 1er Parcial\backend-core"

# Setear la variable de entorno de MongoDB Atlas (copia tu URI real del archivo .env.example)
$env:MONGO_URI = "mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/bpm_inteligente"

# Arrancar el servidor
mvn spring-boot:run
```

> ⚠️ **NUNCA subas credenciales reales al repositorio.** Copia el archivo `.env.example` a `.env` y configura tu URI real ahí. El `.env` ya está en `.gitignore`.

Espera a ver el mensaje:
```
✅ Tomcat started on port 8080
✅ Seeder completado. BD lista para pruebas.
```

El backend estará disponible en: **http://localhost:8080**

### 2️⃣ Levantar el Frontend (Angular)

Abrir **otra terminal** en la carpeta `bpm-frontend`:

```powershell
cd "d:\Software 1er Parcial\bpm-frontend"

# Instalar dependencias (solo la primera vez)
npm install

# Arrancar el servidor de desarrollo (npx ng serve)
ng serve
```

Espera a ver:
```
➜ Local: http://localhost:4200/
```

El frontend estará disponible en: **http://localhost:4200**

---

## 🔑 Credenciales de Pruebas

El seeder crea automáticamente estos usuarios al arrancar el backend:

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | `admin@cre.com` | `admin123` |
| **Diseñador** | `diseno@cre.com` | `diseno123` |
| **Funcionario** | `juan@cre.com` | `func123` |
| **Cliente** | `cliente@cre.com` | `cliente123` |

> **Nota:** El seeder solo crea datos si la BD está vacía. Si necesitas reiniciar, elimina la base de datos `bpm_inteligente` desde MongoDB Atlas y reinicia el backend.

---

## 🗺️ Estructura del Proyecto

```
Software 1er Parcial/
├── backend-core/                 # Spring Boot API
│   ├── src/main/java/com/bpm/inteligente/
│   │   ├── config/               # CORS, Seeder, Mongo
│   │   ├── controller/           # REST endpoints
│   │   ├── domain/               # Entidades MongoDB
│   │   ├── dto/                  # Data Transfer Objects
│   │   ├── exception/            # Excepciones de negocio
│   │   ├── repository/           # MongoRepositories
│   │   └── service/              # Lógica de negocio + Motor BPM
│   └── src/main/resources/
│       └── application.yml       # Configuración
│
├── bpm-frontend/                 # Angular 19 SPA
│   └── src/app/
│       ├── guards/               # Auth & Role guards
│       ├── interceptors/         # HTTP interceptors
│       ├── models/               # TypeScript interfaces
│       ├── pages/
│       │   ├── admin/            # Panel de administración
│       │   ├── designer/         # Editor visual de workflows
│       │   ├── funcionario/      # Bandeja de tareas
│       │   ├── tracking/         # Portal público del cliente
│       │   ├── login/            # Autenticación
│       │   └── register-tenant/  # Registro de empresa
│       └── services/             # Servicios HTTP (Angular Signals)
│
└── mis cosas/                    # Documentación del proyecto
```

---

## 🎨 Módulos del Sistema

### 📐 Diseñador de Workflows
Editor visual node-based (estilo N8n/Zapier) para crear políticas de negocio con calles (swim lanes), nodos y transiciones.

### 📋 Panel del Funcionario
Bandeja de tareas con constructor dinámico de reportes. El funcionario define y llena campos al completar cada tarea.

### 📍 Portal de Tracking (Cliente)
Vista pública tipo timeline para que los clientes rastreen el estado de sus trámites. Accesible sin autenticación en `/tracking`.

### 🛡️ Panel de Administración
Gestión CRUD de usuarios con control de roles (RBAC) por tenant.

---

## 📡 API Endpoints Principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Autenticación |
| `POST` | `/api/auth/registro-empresa` | Registro de tenant |
| `GET` | `/api/politicas/tenant/{id}` | Listar políticas |
| `POST` | `/api/politicas` | Crear política |
| `PUT` | `/api/politicas/{id}` | Actualizar política |
| `PATCH` | `/api/politicas/{id}/activar` | Publicar política |
| `POST` | `/api/tramites` | Iniciar trámite |
| `GET` | `/api/tramites/{id}/tracking` | Tracking público |
| `PATCH` | `/api/registros/{id}/tomar` | Tomar tarea |
| `PATCH` | `/api/registros/completar` | Completar tarea |
| `GET` | `/api/usuarios/tenant/{id}` | Listar usuarios |

---

## ⚠️ Troubleshooting

| Problema | Solución |
|----------|----------|
| `ERR_CONNECTION_REFUSED :8080` | El backend no está corriendo. Levántalo con `mvn spring-boot:run` |
| `The connection string is invalid` | Falta la variable `$env:MONGO_URI`. Seteala antes de ejecutar Maven |
| `Failed to fetch dynamically imported module` | Recarga la página con `Ctrl+Shift+R` (hard reload) |
| Error de CORS | Verifica que el frontend corre en `localhost:4200` |

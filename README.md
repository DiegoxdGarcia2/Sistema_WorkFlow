# ⚡ BPM Inteligente — Motor de Workflows

<div align="center">

[![Desplegado en Google Cloud Run](https://img.shields.io/badge/Desplegado%20en-Google%20Cloud%20Run-blue?logo=google-cloud&logoColor=white&style=for-the-badge)](https://bpm-frontend-238791343286.us-central1.run.app)

### 🪐 ACCESO RÁPIDO A LA PLATAFORMA EN PRODUCCIÓN
## 🔗 [¡ENTRAR A BPM INTELIGENTE AQUÍ!](https://bpm-frontend-238791343286.us-central1.run.app)

admin@cre.com
admin123

---

</div>

> [!IMPORTANT]
> ### 🚀 Enlaces de Producción (Cloud Run)
> - **Portal de Usuario / Frontend (Angular 19):** [https://bpm-frontend-238791343286.us-central1.run.app](https://bpm-frontend-238791343286.us-central1.run.app)
> - **Core API Gateway (Spring Boot + Redis Sidecar):** [https://bpm-backend-core-238791343286.us-central1.run.app](https://bpm-backend-core-238791343286.us-central1.run.app)
> - **Microservicio de IA (FastAPI):** [https://bpm-ai-microservice-238791343286.us-central1.run.app](https://bpm-ai-microservice-238791343286.us-central1.run.app)

---

## 📋 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | Spring Boot 3.4 + Java 17 |
| **Microservicio IA** | Python (FastAPI) + TensorFlow (ONNX Runtime) + OpenAI Whisper + Groq |
| **Base de Datos** | MongoDB Atlas (esquemas dinámicos para formularios de trámites) |
| **Caché / WebSocket PubSub** | Redis ( Alpine Sidecar Container en Cloud Run ) |
| **Almacenamiento** | AWS S3 ( S3Client, presigners, local storage fallback ) |
| **Frontend** | Angular 19 (Zoneless) + Tailwind CSS v4 + Dexie.js (Offline PWA) + ECharts |
| **App Móvil** | Flutter + Riverpod + Hive (Offline-First, Clickable Notifications) |
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

El frontend estará disponible en: **http://localhost:4200**

### 3️⃣ Levantar el Microservicio IA (Python)

Abrir **otra terminal** en la carpeta `ai-microservice`:

```powershell
cd "d:\Software 1er Parcial\ai-microservice"

# Instalar dependencias
pip install -r requirements.txt

# Iniciar el servidor (Uvicorn)
python main.py
```
Estará disponible en **http://localhost:8000**.

### 4️⃣ Levantar la App Móvil (Flutter)

Abrir **otra terminal** en la carpeta `bpm_mobile_client`:

```powershell
cd "d:\Software 1er Parcial\bpm_mobile_client"

# Correr en simulador Android o iOS
flutter run
```

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
├── ai-microservice/              # Microservicio IA (Python/FastAPI)
│   ├── main.py                   # Endpoints NLP y Voice Router
│   ├── ml_service.py             # Predicciones ML y Analítica
│   └── requirements.txt          # Dependencias (Groq, Whisper)
│
├── bpm_mobile_client/            # Cliente Móvil Offline-First (Flutter)
│   └── lib/
│       ├── core/                 # Modelos Hive y Capa de red (Dio)
│       └── features/             # Auth, Tramites (Timeline), Assistant (Micrófono)
│
└── mis cosas/                    # Documentación del proyecto
```

---

## 🎨 Módulos del Sistema

### 📐 Diseñador de Workflows (BPM)
Editor visual node-based (estilo N8n/Zapier) para crear políticas de negocio con calles (swim lanes), nodos y transiciones con soporte de temas de branding y contrastes dinámicos.

### 📋 Panel del Funcionario
Bandeja de tareas inteligente con constructor dinámico de reportes. El funcionario puede consultar predicciones de rutas de IA en tiempo real para agilizar la toma de decisiones.

### 📍 Portal de Tracking (Cliente)
Vista pública tipo timeline para que los clientes rastreen el estado de sus trámites mediante códigos UUID únicos de seguimiento. Accesible sin autenticación en `/tracking`.

### 🛡️ Panel de Administración
Gestión de usuarios por Tenant (SaaS), control de roles (RBAC) y un panel interactivo del estado de los modelos de redes neuronales de TensorFlow en tiempo real.

---

## ✨ Características Avanzadas y Actualizaciones Recientes

### 👥 Colaboración Documental en Tiempo Real
- **Editor tipo Google Docs**: Permite la escritura y edición colaborativa simultánea dentro del repositorio de documentos.
- **Presencia en Vivo**: Indicador dinámico del cursor y presencia del departamento del funcionario mediante WebSockets STOMP y Redis Pub/Sub para escalabilidad horizontal.

### 🧠 Motor Predictivo de Enrutamiento (TensorFlow / ONNX)
- **Predicción en Vivo**: Inferencia en tiempo real sobre tiempos estimados de resolución, cálculo de prioridad y recomendación de rutas óptimas de trámites usando ONNX Runtime en el microservicio.
- **Visualizador de Redes Neuronales**: Dashboard interactivo con gráficos SVG animados en tiempo real que simulan y demuestran la arquitectura de las capas de la red neuronal y autoencoders para detección de anomalías.

### 🎙️ Voice Filler - Asistente de Voz (Whisper + Groq)
- **Llenado por Voz**: Integración de Whisper y Groq Llama 3 para procesar grabaciones de voz del funcionario, extraer la intención y estructurar automáticamente los campos de texto e inputs de formularios dinámicos directamente en MongoDB.

### 📶 Resiliencia Offline-First
- **Web PWA**: Service Workers y Dexie.js local para cachear vistas completas e iniciar trámites encolados sin conexión a internet.
- **App Móvil (Flutter)**: Sincronización transparente de base de datos local Hive a través de un SyncWorker en segundo plano para envío encolado diferido de trámites.

### 🎨 Personalización SaaS & Modo Oscuro Dinámico
- **Drawer de Branding**: Selector lateral en tiempo real que permite modificar el logotipo, color primario/secundario y cambiar dinámicamente entre modo Claro y Oscuro con variables CSS persistidas en `localStorage`.
- **Inversión Inteligente Tailwind v4**: Ajuste automático del contraste de las calles del diseñador y los formularios sin necesidad de duplicar clases CSS.

---

## 📡 API Endpoints Principales

### Core Backend (Spring Boot - 8080)
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
| `POST` | `/api/archivos/upload` | Subir archivo (multipart, tramiteId opcional) |
| `POST` | `/api/archivos/upload-cliente` | Subir archivo desde portal cliente |
| `GET` | `/api/archivos/download/**` | Descargar archivo (redirige a URL firmada de S3) |
| `POST` | `/api/tramites/{tramiteId}/documentos` | Subir nuevo documento (Versión 1) |
| `PUT` | `/api/tramites/{tramiteId}/documentos/{docId}` | Subir nueva versión del documento (v2+) |
| `GET` | `/api/tramites/{tramiteId}/documentos` | Listar documentos activos del trámite |
| `GET` | `/api/tramites/{tramiteId}/documentos/{docId}/historial` | Historial de versiones y auditoría de cambios |
| `GET` | `/api/documentos/{docId}/version/{v}/preview` | Obtener URL prefirmada de AWS S3 para vista previa |
| `DELETE`| `/api/documentos/{docId}` | Eliminación lógica de un documento |

### Microservicio de IA/ML (FastAPI - 8000)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ai/forms/voice-fill` | Recibe audio y transcribe (Whisper) + estructura formulario (Groq) |
| `POST` | `/api/ai/ml/nl-to-aggregation` | Traduce lenguaje natural a consulta agregada MongoDB en sandbox seguro |
| `POST` | `/api/ai/mobile/voice-router` | Recibe audio móvil, detecta intención y devuelve la política inferida |
| `POST` | `/api/ai/ml/analyze-bottlenecks` | Análisis de cuellos de botella en base a registros de actividad |
| `GET` | `/api/ai/ml/insights` | Estadísticas descriptivas, alertas e insights semánticos en lenguaje natural |

---

## ⚠️ Troubleshooting

| Problema | Solución |
|----------|----------|
| `ERR_CONNECTION_REFUSED :8080` | El backend no está corriendo. Levántalo con `mvn spring-boot:run` |
| `The connection string is invalid` | Falta la variable `$env:MONGO_URI`. Seteala antes de ejecutar Maven |
| `Failed to fetch dynamically imported module` | Recarga la página con `Ctrl+Shift+R` (hard reload) |
| Error de CORS | Verifica que el frontend corre en `localhost:4200` |

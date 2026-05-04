# BPM Inteligente — Arquitectura del Sistema

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Backend** | Spring Boot | 3.4.4 |
| **Base de Datos** | MongoDB | 7.x (Atlas / Local) |
| **Frontend** | Angular | 17+ con Signals |
| **Autenticación** | JWT (jjwt 0.12.5) | Stateless |
| **Build Backend** | Maven | 3.9+ |
| **Build Frontend** | Angular CLI + Vite | 17+ |

## Principios Arquitectónicos

### 1. Backend Stateless (JWT)
- **No** se usan sesiones HTTP. Cada request se autentica con un `Bearer Token` JWT.
- El token JWT contiene claims personalizados: `id`, `tenantId`, `rol`.
- El `JwtAuthenticationFilter` valida el token y puebla el `SecurityContext` + `TenantContext`.
- La expiración del token es configurable (default: 24h).

### 2. Multi-Tenancy (Data Isolation)
- Cada entidad de negocio incluye un campo `tenantId`.
- El `TenantContext` (ThreadLocal) se puebla automáticamente desde el JWT en cada request.
- Los repositorios y servicios **DEBEN** filtrar siempre por `tenantId` para garantizar aislamiento de datos.
- Las consultas MongoDB usan `CompoundIndex` con `tenantId` como primer campo para performance.

### 3. Auditoría
- Spring Data MongoDB Auditing habilitado (`@EnableMongoAuditing`).
- Los campos `@CreatedBy`, `@CreatedDate`, `@LastModifiedBy`, `@LastModifiedDate` se pueblan automáticamente.
- El `AuditorAware` lee del `TenantContext.getCurrentUserId()`.

### 4. Seguridad
- Spring Security 6 con filtro JWT custom.
- CORS configurado para `http://localhost:4200` (desarrollo).
- Endpoints públicos: `/api/auth/**`, Swagger, Actuator, WebSocket endpoints.
- Method-level security con `@EnableMethodSecurity` y `@PreAuthorize`.

### 5. WebSockets (STOMP sobre SockJS)
- Broker en memoria con prefijo `/topic` (broadcast).
- Mensajes del cliente prefijados con `/app`.
- Endpoints: `/ws-bpm` (nativo) y `/ws-bpm-sockjs` (fallback SockJS).
- **Ver `WEBSOCKET_RULES.md` para reglas de implementación**.

## Estructura del Proyecto

```
backend-core/
├── src/main/java/com/bpm/inteligente/
│   ├── config/          # Configuración: Security, JWT, CORS, WebSocket, MongoDB
│   ├── controller/      # REST Controllers
│   ├── domain/          # Entidades MongoDB (@Document)
│   ├── domain/enums/    # Enums del dominio
│   ├── dto/             # DTOs y Mappers
│   ├── exception/       # Excepciones y GlobalExceptionHandler
│   ├── repository/      # Spring Data MongoDB Repositories
│   └── service/         # Lógica de negocio
├── src/main/resources/
│   └── application.yml  # Configuración centralizada
└── pom.xml

bpm-frontend/
├── src/app/
│   ├── components/      # Componentes reutilizables
│   ├── guards/          # Route Guards (auth, role)
│   ├── interceptors/    # HTTP Interceptors (JWT)
│   ├── models/          # Interfaces TypeScript
│   ├── pages/           # Páginas por rol (admin, designer, funcionario)
│   └── services/        # Servicios Angular (API, Auth, WebSocket)
└── angular.json
```

## Reglas de Desarrollo

1. **Nunca** hardcodear tenantId. Siempre usar `TenantContext.getCurrentTenant()`.
2. **Nunca** exponer el `password` de `Usuario` en DTOs.
3. **Siempre** usar DTOs para comunicación entre capas (nunca devolver entidades directamente).
4. **Siempre** validar inputs con `@Valid` y Bean Validation.
5. **Siempre** documentar endpoints con OpenAPI/Swagger annotations.

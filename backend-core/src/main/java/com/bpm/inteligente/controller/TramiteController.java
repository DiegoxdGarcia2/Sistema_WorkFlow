package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.dto.DomainMapper;
import com.bpm.inteligente.dto.IniciarTramiteRequest;
import com.bpm.inteligente.dto.TrackingDTO;
import com.bpm.inteligente.dto.TramiteDTO;
import com.bpm.inteligente.service.PoliticaNegocioService;
import com.bpm.inteligente.service.RegistroActividadService;
import com.bpm.inteligente.service.TramiteService;
import com.bpm.inteligente.service.SyncQueueProducer;
import com.bpm.inteligente.dto.SyncRequestDTO;
import com.bpm.inteligente.dto.SyncResponseDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/tramites")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class TramiteController {

    private final TramiteService tramiteService;
    private final PoliticaNegocioService politicaService;
    private final RegistroActividadService registroService;
    private final SyncQueueProducer syncQueueProducer;
    private final com.bpm.inteligente.repository.UsuarioRepository usuarioRepo;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TramiteDTO iniciar(@Valid @RequestBody IniciarTramiteRequest request) {
        Tramite tramite = tramiteService.iniciar(
                request.getPoliticaId(), 
                request.getUsuarioId(),
                request.getClienteId(),
                request.getDocumentoCliente(),
                request.getClienteNombre()
        );
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return DomainMapper.toDTO(tramite, politica.getNombre());
    }

    @PostMapping("/sync")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SyncResponseDTO sincronizarOffline(@RequestBody List<@Valid SyncRequestDTO> requests) {
        syncQueueProducer.enqueueAll(requests);
        return new SyncResponseDTO(requests != null ? requests.size() : 0, "QUEUED");
    }

    @PostMapping("/ai-iniciar")
    @ResponseStatus(HttpStatus.CREATED)
    public com.bpm.inteligente.dto.ai.AiAssignResponse aiIniciar(@RequestBody com.bpm.inteligente.dto.ai.AiAssignRequest request) {
        String clienteId = com.bpm.inteligente.config.TenantContext.getCurrentClienteId();
        String tenantId = com.bpm.inteligente.config.TenantContext.getCurrentTenant();
        String userId = com.bpm.inteligente.config.TenantContext.getCurrentUserId();

        if (clienteId == null && userId != null && userId.endsWith("-usr")) {
            clienteId = userId.replace("-usr", "");
        }

        if (clienteId == null) {
            throw new com.bpm.inteligente.exception.BusinessRuleException("Solo los clientes pueden usar el auto-asignador de IA. (userId: " + userId + ")");
        }

        // 1. Obtener politicas activas
        List<PoliticaNegocio> activas = politicaService.listarActivasPorTenant(tenantId);
        if (activas.isEmpty()) {
            return com.bpm.inteligente.dto.ai.AiAssignResponse.builder()
                    .success(false)
                    .message("No hay trámites disponibles en esta empresa.")
                    .build();
        }

        // 2. Mapear a DTO para Python
        List<com.bpm.inteligente.dto.ai.AiToPythonRequest.WorkflowInfo> workflows = activas.stream()
                .map(p -> com.bpm.inteligente.dto.ai.AiToPythonRequest.WorkflowInfo.builder()
                        .id(p.getId())
                        .nombre(p.getNombre())
                        .descripcion(p.getDescripcion() != null ? p.getDescripcion() : "Sin descripción")
                        .build())
                .toList();

        com.bpm.inteligente.dto.ai.AiToPythonRequest pythonReq = com.bpm.inteligente.dto.ai.AiToPythonRequest.builder()
                .prompt(request.getPrompt())
                .available_workflows(workflows)
                .build();

        // 3. Llamar a Python
        org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
        String pythonUrl = "http://localhost:8000/api/ai/forms/assign-workflow";
        com.bpm.inteligente.dto.ai.AiFromPythonResponse pyRes;
        try {
            pyRes = restTemplate.postForObject(pythonUrl, pythonReq, com.bpm.inteligente.dto.ai.AiFromPythonResponse.class);
        } catch (Exception e) {
            System.err.println("Error llamando a Python AI assign: " + e.getMessage());
            throw new com.bpm.inteligente.exception.BusinessRuleException("El servicio de IA no está disponible temporalmente.");
        }

        if (pyRes == null || pyRes.getAssigned_politica_id() == null) {
            return com.bpm.inteligente.dto.ai.AiAssignResponse.builder()
                    .success(false)
                    .message(pyRes != null && pyRes.getReason() != null ? pyRes.getReason() : "La IA no pudo encontrar un trámite adecuado para tu solicitud.")
                    .build();
        }

        // 4. Validar Anti-Spam: Solo bloquear si está EN_PROGRESO o INICIADO
        String politicaId = pyRes.getAssigned_politica_id();
        PoliticaNegocio politica;
        try {
            politica = politicaService.buscarPorId(politicaId);
        } catch (Exception e) {
            return com.bpm.inteligente.dto.ai.AiAssignResponse.builder()
                    .success(false)
                    .message("La IA seleccionó un trámite que ya no está disponible.")
                    .build();
        }

        List<Tramite> misTramites = tramiteService.buscarPorClienteId(clienteId);
        boolean yaEnProceso = misTramites.stream()
                .anyMatch(t -> t.getPoliticaId().equals(politicaId) && 
                              (t.getEstado() == EstadoTramite.EN_PROGRESO || t.getEstado() == EstadoTramite.INICIADO));

        if (yaEnProceso) {
            return com.bpm.inteligente.dto.ai.AiAssignResponse.builder()
                    .success(false)
                    .message("Ya tienes un trámite '" + politica.getNombre() + "' en progreso. Debes esperar a que finalice antes de solicitar otro.")
                    .build();
        }

        // 5. Iniciar Tramite
        com.bpm.inteligente.domain.Usuario usuario = usuarioRepo.findById(userId)
                .orElseThrow(() -> new com.bpm.inteligente.exception.ResourceNotFoundException("Usuario", "id", userId));
                
        Tramite tramite = tramiteService.iniciar(
                politicaId, 
                userId,
                clienteId,
                clienteId,
                usuario.getNombre() + " " + (usuario.getApellido() != null ? usuario.getApellido() : "")
        );

        return com.bpm.inteligente.dto.ai.AiAssignResponse.builder()
                .success(true)
                .tramiteId(tramite.getId())
                .politicaNombre(politica.getNombre())
                .message(pyRes.getReason() != null ? pyRes.getReason() : "Trámite asignado e iniciado correctamente.")
                .build();
    }


    @PostMapping("/{id}/cancelar")
    @CrossOrigin(origins = "*", allowedHeaders = "*")
    public TramiteDTO cancelar(@PathVariable("id") String id) {
        try {
            System.out.println("🛑 Recibida solicitud de cancelación para trámite: " + id);
            if (id == null || id.isEmpty()) {
                throw new IllegalArgumentException("El ID del trámite no puede ser nulo o vacío");
            }
            Tramite tramite = tramiteService.cancelar(id);
            
            String nombrePolitica = "Trámite desconocido";
            try {
                PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
                if (politica != null) nombrePolitica = politica.getNombre();
            } catch (Exception e) {
                System.err.println("⚠️ No se pudo obtener el nombre de la política al cancelar: " + e.getMessage());
            }

            System.out.println("✅ Trámite " + id + " cancelado exitosamente.");
            return DomainMapper.toDTO(tramite, nombrePolitica);
        } catch (Exception e) {
            System.err.println("❌ ERROR al cancelar trámite " + id + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/{id}")
    public TramiteDTO buscarPorId(@PathVariable String id) {
        Tramite tramite = tramiteService.buscarPorId(id);
        String nombrePolitica = "Trámite Huérfano";
        try {
            PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
            nombrePolitica = politica.getNombre();
        } catch (Exception e) {
            // Ignore if orphaned
        }
        return DomainMapper.toDTO(tramite, nombrePolitica);
    }

    @GetMapping("/tenant/{tenantId}")
    public List<TramiteDTO> listarPorTenantYEstado(
            @PathVariable String tenantId,
            @RequestParam(defaultValue = "EN_PROGRESO") EstadoTramite estado) {
        return tramiteService.listarPorTenantYEstado(tenantId, estado).stream()
                .map(t -> {
                    String nombreP = "Trámite Huérfano";
                    try {
                        PoliticaNegocio p = politicaService.buscarPorId(t.getPoliticaId());
                        nombreP = p.getNombre();
                    } catch(Exception e){}
                    return DomainMapper.toDTO(t, nombreP);
                })
                .toList();
    }

    @GetMapping("/monitor/tenant/{tenantId}")
    public List<com.bpm.inteligente.dto.MonitorTramiteDTO> monitor(@PathVariable String tenantId) {
        return tramiteService.obtenerMonitorTramites(tenantId);
    }

    @GetMapping("/historial/tenant/{tenantId}")
    public List<com.bpm.inteligente.dto.MonitorTramiteDTO> historial(@PathVariable String tenantId) {
        return tramiteService.obtenerHistorialTramites(tenantId);
    }

    /**
     * Portal del Cliente: Obtiene todos los trámites asociados al cliente autenticado.
     * Requiere ROL_CLIENTE.
     */
    @GetMapping("/mis-tramites")
    public List<TrackingDTO> misTramites() {
        String clienteId = com.bpm.inteligente.config.TenantContext.getCurrentClienteId();
        String userId = com.bpm.inteligente.config.TenantContext.getCurrentUserId();
        
        if (clienteId == null && userId != null && userId.endsWith("-usr")) {
            clienteId = userId.replace("-usr", "");
        }

        if (clienteId == null) {
            throw new com.bpm.inteligente.exception.BusinessRuleException("No se encontró ID de cliente en la sesión. (userId: " + userId + ")");
        }
        
        return tramiteService.buscarPorClienteId(clienteId).stream()
                .map(tramite -> {
                    PoliticaNegocio politica = null;
                    String nombrePolitica = "Trámite Huérfano (Política eliminada)";
                    try {
                        politica = politicaService.buscarPorId(tramite.getPoliticaId());
                        nombrePolitica = politica.getNombre();
                    } catch (Exception e) {
                        System.err.println("Trámite huérfano detectado: " + tramite.getId() + " - Política no existe");
                    }
                    
                    TramiteDTO tramiteDTO = DomainMapper.toDTO(tramite, nombrePolitica);
                    List<RegistroActividad> registros = registroService.listarPorTramite(tramite.getId());
                    
                    final PoliticaNegocio politicaFinal = politica;
                    List<TrackingDTO.PasoTimeline> timeline = registros.stream()
                            .sorted((a, b) -> {
                                Instant t1 = a.getAsignadoEn() != null ? a.getAsignadoEn() : Instant.MIN;
                                Instant t2 = b.getAsignadoEn() != null ? b.getAsignadoEn() : Instant.MIN;
                                return t1.compareTo(t2);
                            })
                            .map(r -> {
                                String actNombre = (politicaFinal != null) ? resolverNombreActividad(politicaFinal, r.getActividadId()) : "Actividad desconocida";
                                String calleNombre = (politicaFinal != null) ? resolverCalleDeActividad(politicaFinal, r.getActividadId()) : "Departamento desconocido";
                                return TrackingDTO.PasoTimeline.builder()
                                        .registroId(r.getId())
                                        .actividadNombre(actNombre)
                                        .calleNombre(calleNombre)
                                        .estado(r.getEstado().name())
                                        .ejecutadoPor(r.getEjecutadoPor())
                                        .notas(r.getNotas())
                                        .asignadoEn(r.getAsignadoEn() != null ? r.getAsignadoEn().toString() : null)
                                        .completadoEn(r.getCompletadoEn() != null ? r.getCompletadoEn().toString() : null)
                                        .datosFormulario(r.getDatosFormulario())
                                        .esquemaFormulario(r.getEsquemaFormulario())
                                        .archivos(r.getArchivos())
                                        .build();
                            })
                            .toList();
                    return TrackingDTO.builder()
                            .tramite(tramiteDTO)
                            .timeline(timeline)
                            .build();
                })
                .toList();
    }

    // ══════════════════════════════════════════════════════════════
    // ENDPOINT PÚBLICO: Portal del Cliente — Tracking de Trámites
    // ══════════════════════════════════════════════════════════════

    /**
     * Devuelve el trámite con sus registros de actividad ordenados
     * cronológicamente para la vista de línea de tiempo del cliente.
     * Endpoint público (sin autenticación requerida).
     */
    @GetMapping("/{id}/tracking")
    public TrackingDTO tracking(@PathVariable String id) {
        Tramite tramite = tramiteService.buscarPorId(id);
        
        PoliticaNegocio politica = null;
        String nombrePolitica = "Trámite Huérfano (Política eliminada)";
        try {
            politica = politicaService.buscarPorId(tramite.getPoliticaId());
            nombrePolitica = politica.getNombre();
        } catch (Exception e) {
            System.err.println("Trámite huérfano detectado en tracking público: " + id);
        }
        
        TramiteDTO tramiteDTO = DomainMapper.toDTO(tramite, nombrePolitica);

        List<RegistroActividad> registros = registroService.listarPorTramite(id);

        final PoliticaNegocio politicaFinal = politica;
        List<TrackingDTO.PasoTimeline> timeline = registros.stream()
                .sorted((a, b) -> {
                    Instant t1 = a.getAsignadoEn() != null ? a.getAsignadoEn() : Instant.MIN;
                    Instant t2 = b.getAsignadoEn() != null ? b.getAsignadoEn() : Instant.MIN;
                    return t1.compareTo(t2);
                })
                .map(r -> {
                    String actNombre = (politicaFinal != null) ? resolverNombreActividad(politicaFinal, r.getActividadId()) : "Actividad desconocida";
                    String calleNombre = (politicaFinal != null) ? resolverCalleDeActividad(politicaFinal, r.getActividadId()) : "Departamento desconocido";

                    return TrackingDTO.PasoTimeline.builder()
                            .registroId(r.getId())
                            .actividadNombre(actNombre)
                            .calleNombre(calleNombre)
                            .estado(r.getEstado().name())
                            .ejecutadoPor(r.getEjecutadoPor())
                            .notas(r.getNotas())
                            .asignadoEn(r.getAsignadoEn() != null ? r.getAsignadoEn().toString() : null)
                            .completadoEn(r.getCompletadoEn() != null ? r.getCompletadoEn().toString() : null)
                            .datosFormulario(r.getDatosFormulario())
                            .esquemaFormulario(r.getEsquemaFormulario())
                            .archivos(r.getArchivos())
                            .build();
                })
                .toList();

        return TrackingDTO.builder()
                .tramite(tramiteDTO)
                .timeline(timeline)
                .build();
    }

    /**
     * Busca trámites por código de seguimiento, CI, nombre o correo electrónico del cliente.
     * Retorna una lista de TrackingDTO con la información completa.
     */
    @GetMapping("/tracking/buscar")
    public List<TrackingDTO> buscarTracking(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return List.of();
        }
        String escaped = q.trim().replaceAll("[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ @._-]", "");
        return tramiteService.buscarTrackingPorTermino(escaped).stream()
                .map(tramite -> {
                    PoliticaNegocio politica = null;
                    String nombrePolitica = "Trámite Huérfano (Política eliminada)";
                    try {
                        politica = politicaService.buscarPorId(tramite.getPoliticaId());
                        nombrePolitica = politica.getNombre();
                    } catch (Exception e) {
                        System.err.println("Trámite huérfano detectado al buscar: " + tramite.getId());
                    }
                    
                    TramiteDTO tramiteDTO = DomainMapper.toDTO(tramite, nombrePolitica);
                    List<RegistroActividad> registros = registroService.listarPorTramite(tramite.getId());
                    
                    final PoliticaNegocio politicaFinal = politica;
                    List<TrackingDTO.PasoTimeline> timeline = registros.stream()
                            .sorted((a, b) -> {
                                Instant t1 = a.getAsignadoEn() != null ? a.getAsignadoEn() : Instant.MIN;
                                Instant t2 = b.getAsignadoEn() != null ? b.getAsignadoEn() : Instant.MIN;
                                return t1.compareTo(t2);
                            })
                            .map(r -> {
                                String actNombre = (politicaFinal != null) ? resolverNombreActividad(politicaFinal, r.getActividadId()) : "Actividad desconocida";
                                String calleNombre = (politicaFinal != null) ? resolverCalleDeActividad(politicaFinal, r.getActividadId()) : "Departamento desconocido";
                                return TrackingDTO.PasoTimeline.builder()
                                        .registroId(r.getId())
                                        .actividadNombre(actNombre)
                                        .calleNombre(calleNombre)
                                        .estado(r.getEstado().name())
                                        .ejecutadoPor(r.getEjecutadoPor())
                                        .notas(r.getNotas())
                                        .asignadoEn(r.getAsignadoEn() != null ? r.getAsignadoEn().toString() : null)
                                        .completadoEn(r.getCompletadoEn() != null ? r.getCompletadoEn().toString() : null)
                                        .datosFormulario(r.getDatosFormulario())
                                        .esquemaFormulario(r.getEsquemaFormulario())
                                        .archivos(r.getArchivos())
                                        .build();
                            })
                            .toList();
                    return TrackingDTO.builder()
                            .tramite(tramiteDTO)
                            .timeline(timeline)
                            .build();
                })
                .toList();
    }

    // ── Helpers privados ──────────────────────────────────────────

    private String resolverNombreActividad(PoliticaNegocio politica, String actividadId) {
        return politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .filter(a -> a.getId().equals(actividadId))
                .findFirst()
                .map(Actividad::getNombre)
                .orElse("Actividad desconocida");
    }

    private String resolverCalleDeActividad(PoliticaNegocio politica, String actividadId) {
        return politica.getCalles().stream()
                .filter(c -> c.getActividades().stream().anyMatch(a -> a.getId().equals(actividadId)))
                .findFirst()
                .map(Calle::getNombre)
                .orElse("Departamento desconocido");
    }
}

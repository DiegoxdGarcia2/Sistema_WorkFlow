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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TramiteDTO iniciar(@Valid @RequestBody IniciarTramiteRequest request) {
        Tramite tramite = tramiteService.iniciar(request.getPoliticaId(), request.getUsuarioId());
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return DomainMapper.toDTO(tramite, politica.getNombre());
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
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return DomainMapper.toDTO(tramite, politica.getNombre());
    }

    @GetMapping("/tenant/{tenantId}")
    public List<TramiteDTO> listarPorTenantYEstado(
            @PathVariable String tenantId,
            @RequestParam(defaultValue = "EN_PROGRESO") EstadoTramite estado) {
        return tramiteService.listarPorTenantYEstado(tenantId, estado).stream()
                .map(t -> {
                    PoliticaNegocio p = politicaService.buscarPorId(t.getPoliticaId());
                    return DomainMapper.toDTO(t, p.getNombre());
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
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        TramiteDTO tramiteDTO = DomainMapper.toDTO(tramite, politica.getNombre());

        List<RegistroActividad> registros = registroService.listarPorTramite(id);

        List<TrackingDTO.PasoTimeline> timeline = registros.stream()
                .sorted((a, b) -> {
                    Instant t1 = a.getAsignadoEn() != null ? a.getAsignadoEn() : Instant.MIN;
                    Instant t2 = b.getAsignadoEn() != null ? b.getAsignadoEn() : Instant.MIN;
                    return t1.compareTo(t2);
                })
                .map(r -> {
                    String actNombre = resolverNombreActividad(politica, r.getActividadId());
                    String calleNombre = resolverCalleDeActividad(politica, r.getActividadId());

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

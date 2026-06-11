package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Actividad;
import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.dto.CompletarTareaRequest;
import com.bpm.inteligente.dto.DomainMapper;
import com.bpm.inteligente.dto.RegistroActividadDTO;
import com.bpm.inteligente.service.PoliticaNegocioService;
import com.bpm.inteligente.service.RegistroActividadService;
import com.bpm.inteligente.service.TramiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registros")
@RequiredArgsConstructor
public class RegistroController {

    private final RegistroActividadService registroService;
    private final TramiteService tramiteService;
    private final PoliticaNegocioService politicaService;

    @PatchMapping("/{id}/tomar")
    public RegistroActividadDTO tomarTarea(
            @PathVariable String id,
            @RequestParam String userId) {
        RegistroActividad registro = registroService.tomarTarea(id, userId);
        return toDTO(registro);
    }

    @PatchMapping("/completar")
    public RegistroActividadDTO completarTarea(@Valid @RequestBody CompletarTareaRequest request) {
        RegistroActividad registro = registroService.completarTarea(
                request.getRegistroId(),
                request.getEsquemaFormulario(),
                request.getDatosFormulario(),
                request.getArchivos(),
                request.getNotas());
        return toDTO(registro);
    }

    @GetMapping("/tramite/{tramiteId}")
    public List<RegistroActividadDTO> listarPorTramite(@PathVariable String tramiteId) {
        return registroService.listarPorTramite(tramiteId).stream()
                .map(this::toDTO)
                .toList();
    }

    @GetMapping("/pendientes/{userId}")
    public List<RegistroActividadDTO> bandejaPendientes(@PathVariable String userId) {
        return registroService.bandejaPendientes(userId).stream()
                .map(this::toDTO)
                .toList();
    }

    @GetMapping("/sin-asignar")
    public List<RegistroActividadDTO> tareasNoAsignadas() {
        return registroService.tareasNoAsignadas().stream()
                .map(this::toDTO)
                .toList();
    }

    @GetMapping("/bandeja-departamento/{deptoId}")
    public List<RegistroActividadDTO> bandejaPorDepartamento(@PathVariable String deptoId) {
        return registroService.bandejaPorDepartamento(deptoId).stream()
                .map(this::toDTO)
                .toList();
    }

    @GetMapping("/sin-asignar-departamento/{deptoId}")
    public List<RegistroActividadDTO> tareasNoAsignadasPorDepartamento(@PathVariable String deptoId) {
        return registroService.tareasNoAsignadasPorDepartamento(deptoId).stream()
                .map(this::toDTO)
                .toList();
    }

    @GetMapping("/historial/{userId}")
    public List<RegistroActividadDTO> historialPorUsuario(@PathVariable String userId) {
        return registroService.historialPorUsuario(userId).stream()
                .map(this::toDTO)
                .toList();
    }

    // ── Helper ──────────────────────────────────────────────────

    private RegistroActividadDTO toDTO(RegistroActividad registro) {
        String actNombre = "Actividad desconocida";
        String clienteNombre = null;
        String politicaId = null;
        List<String> documentosRequeridos = null;
        try {
            Tramite tramite = tramiteService.buscarPorId(registro.getTramiteId());
            if (tramite != null) {
                clienteNombre = tramite.getClienteNombre();
                politicaId = tramite.getPoliticaId();
                PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
                if (politica != null && politica.getCalles() != null) {
                    Actividad actObj = politica.getCalles().stream()
                            .flatMap(c -> c.getActividades().stream())
                            .filter(a -> a.getId().equals(registro.getActividadId()))
                            .findFirst()
                            .orElse(null);
                    if (actObj != null) {
                        actNombre = actObj.getNombre();
                        documentosRequeridos = actObj.getDocumentosRequeridos();
                    }
                }
            }
        } catch (Exception e) {
            // Silently fall back to defaults
        }
        return DomainMapper.toDTO(registro, actNombre, clienteNombre, politicaId, documentosRequeridos);
    }
}

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
        String actNombre = resolverNombreActividad(registro);
        return DomainMapper.toDTO(registro, actNombre);
    }

    @PatchMapping("/completar")
    public RegistroActividadDTO completarTarea(@Valid @RequestBody CompletarTareaRequest request) {
        RegistroActividad registro = registroService.completarTarea(
                request.getRegistroId(),
                request.getEsquemaFormulario(),
                request.getDatosFormulario(),
                request.getArchivos(),
                request.getNotas());
        String actNombre = resolverNombreActividad(registro);
        return DomainMapper.toDTO(registro, actNombre);
    }

    @GetMapping("/tramite/{tramiteId}")
    public List<RegistroActividadDTO> listarPorTramite(@PathVariable String tramiteId) {
        return registroService.listarPorTramite(tramiteId).stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    @GetMapping("/pendientes/{userId}")
    public List<RegistroActividadDTO> bandejaPendientes(@PathVariable String userId) {
        return registroService.bandejaPendientes(userId).stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    @GetMapping("/sin-asignar")
    public List<RegistroActividadDTO> tareasNoAsignadas() {
        return registroService.tareasNoAsignadas().stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    @GetMapping("/bandeja-departamento/{deptoId}")
    public List<RegistroActividadDTO> bandejaPorDepartamento(@PathVariable String deptoId) {
        return registroService.bandejaPorDepartamento(deptoId).stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    @GetMapping("/sin-asignar-departamento/{deptoId}")
    public List<RegistroActividadDTO> tareasNoAsignadasPorDepartamento(@PathVariable String deptoId) {
        return registroService.tareasNoAsignadasPorDepartamento(deptoId).stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    @GetMapping("/historial/{userId}")
    public List<RegistroActividadDTO> historialPorUsuario(@PathVariable String userId) {
        return registroService.historialPorUsuario(userId).stream()
                .map(r -> DomainMapper.toDTO(r, resolverNombreActividad(r)))
                .toList();
    }

    // ── Helper ──────────────────────────────────────────────────

    private String resolverNombreActividad(RegistroActividad registro) {
        Tramite tramite = tramiteService.buscarPorId(registro.getTramiteId());
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .filter(a -> a.getId().equals(registro.getActividadId()))
                .findFirst()
                .map(Actividad::getNombre)
                .orElse("Actividad desconocida");
    }
}

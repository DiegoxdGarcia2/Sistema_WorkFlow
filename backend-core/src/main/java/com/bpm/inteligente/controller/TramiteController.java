package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.dto.DomainMapper;
import com.bpm.inteligente.dto.IniciarTramiteRequest;
import com.bpm.inteligente.dto.TramiteDTO;
import com.bpm.inteligente.service.PoliticaNegocioService;
import com.bpm.inteligente.service.TramiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tramites")
@RequiredArgsConstructor
public class TramiteController {

    private final TramiteService tramiteService;
    private final PoliticaNegocioService politicaService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TramiteDTO iniciar(@Valid @RequestBody IniciarTramiteRequest request) {
        Tramite tramite = tramiteService.iniciar(request.getPoliticaId());
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return DomainMapper.toDTO(tramite, politica.getNombre());
    }

    @PatchMapping("/{id}/cancelar")
    public TramiteDTO cancelar(@PathVariable String id) {
        Tramite tramite = tramiteService.cancelar(id);
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        return DomainMapper.toDTO(tramite, politica.getNombre());
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
}

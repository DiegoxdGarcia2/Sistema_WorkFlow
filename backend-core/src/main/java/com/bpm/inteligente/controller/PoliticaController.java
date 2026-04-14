package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.dto.DomainMapper;
import com.bpm.inteligente.dto.PoliticaDTO;
import com.bpm.inteligente.service.PoliticaNegocioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/politicas")
@RequiredArgsConstructor
public class PoliticaController {

    private final PoliticaNegocioService politicaService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PoliticaDTO crear(@Valid @RequestBody PoliticaDTO dto) {
        PoliticaNegocio creada = politicaService.crear(DomainMapper.toDomain(dto));
        return DomainMapper.toDTO(creada);
    }

    @PutMapping("/{id}")
    public PoliticaDTO actualizar(@PathVariable String id, @Valid @RequestBody PoliticaDTO dto) {
        PoliticaNegocio actualizada = politicaService.actualizar(id, DomainMapper.toDomain(dto));
        return DomainMapper.toDTO(actualizada);
    }

    @PatchMapping("/{id}/activar")
    public PoliticaDTO activar(@PathVariable String id) {
        return DomainMapper.toDTO(politicaService.activar(id));
    }

    @GetMapping("/{id}")
    public PoliticaDTO buscarPorId(@PathVariable String id) {
        return DomainMapper.toDTO(politicaService.buscarPorId(id));
    }

    @GetMapping("/tenant/{tenantId}")
    public List<PoliticaDTO> listarPorTenant(@PathVariable String tenantId) {
        return politicaService.listarPorTenant(tenantId).stream()
                .map(DomainMapper::toDTO)
                .toList();
    }

    @GetMapping("/tenant/{tenantId}/activas")
    public List<PoliticaDTO> listarActivasPorTenant(@PathVariable String tenantId) {
        return politicaService.listarActivasPorTenant(tenantId).stream()
                .map(DomainMapper::toDTO)
                .toList();
    }
}

package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.DomainMapper;
import com.bpm.inteligente.dto.TenantDTO;
import com.bpm.inteligente.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantRepository tenantRepo;

    @GetMapping
    public List<TenantDTO> listar() {
        return tenantRepo.findAll().stream()
                .map(DomainMapper::toDTO)
                .toList();
    }

    @GetMapping("/{id}")
    public TenantDTO buscarPorId(@PathVariable String id) {
        return tenantRepo.findById(id)
                .map(DomainMapper::toDTO)
                .orElseThrow();
    }

    @PutMapping("/{id}")
    public TenantDTO actualizar(@PathVariable String id, @RequestBody TenantDTO dto) {
        com.bpm.inteligente.domain.Tenant t = tenantRepo.findById(id).orElseThrow();
        t.setNombre(dto.getNombre());
        t.setNit(dto.getNit());
        t.setDireccion(dto.getDireccion());
        t.setIndustria(dto.getIndustria());
        t.setSitioWeb(dto.getSitioWeb());
        t.setTelefonoInstitucional(dto.getTelefonoInstitucional());
        t.setEmailContacto(dto.getEmailContacto());
        t.setLogoUrl(dto.getLogoUrl());
        t.setLema(dto.getLema());
        t.setActualizadoEn(java.time.Instant.now());
        return DomainMapper.toDTO(tenantRepo.save(t));
    }
}

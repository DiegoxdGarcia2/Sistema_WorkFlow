package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Tenant;
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
    public List<Tenant> listar() {
        return tenantRepo.findAll();
    }

    @GetMapping("/{id}")
    public Tenant buscarPorId(@PathVariable String id) {
        return tenantRepo.findById(id).orElseThrow();
    }
}

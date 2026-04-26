package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.FormularioTemplate;
import com.bpm.inteligente.service.FormularioService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/formularios")
@RequiredArgsConstructor
public class FormularioController {

    private final FormularioService service;

    @GetMapping("/tenant/{tenantId}")
    public List<FormularioTemplate> listar(@PathVariable String tenantId) {
        return service.listarPorTenant(tenantId);
    }

    @GetMapping("/{id}")
    public FormularioTemplate buscar(@PathVariable String id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    public FormularioTemplate crear(@RequestBody FormularioTemplate template) {
        return service.crear(template);
    }

    @PutMapping("/{id}")
    public FormularioTemplate actualizar(@PathVariable String id, @RequestBody FormularioTemplate template) {
        return service.actualizar(id, template);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable String id) {
        service.eliminar(id);
    }
}

package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Departamento;
import com.bpm.inteligente.repository.DepartamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/departamentos")
@RequiredArgsConstructor
public class DepartamentoController {

    private final DepartamentoRepository deptoRepo;

    @GetMapping("/tenant/{tenantId}")
    public List<Departamento> listarPorTenant(@PathVariable String tenantId) {
        return deptoRepo.findByTenantId(tenantId);
    }

    @PostMapping("/tenant/{tenantId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Departamento crear(@PathVariable String tenantId, @RequestBody Departamento depto) {
        depto.setId(UUID.randomUUID().toString());
        depto.setTenantId(tenantId);
        return deptoRepo.save(depto);
    }

    @PutMapping("/{id}")
    public Departamento actualizar(@PathVariable String id, @RequestBody Departamento depto) {
        Departamento existing = deptoRepo.findById(id).orElseThrow();
        existing.setNombre(depto.getNombre());
        existing.setDescripcion(depto.getDescripcion());
        existing.setCodigo(depto.getCodigo());
        existing.setUbicacion(depto.getUbicacion());
        existing.setPresupuesto(depto.getPresupuesto());
        existing.setAtributosExtra(depto.getAtributosExtra());
        return deptoRepo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable String id) {
        deptoRepo.deleteById(id);
    }
}

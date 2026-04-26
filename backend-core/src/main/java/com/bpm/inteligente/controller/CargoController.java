package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Cargo;
import com.bpm.inteligente.repository.CargoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cargos")
@RequiredArgsConstructor
public class CargoController {

    private final CargoRepository cargoRepo;

    @GetMapping("/tenant/{tenantId}")
    public List<Cargo> listarPorTenant(@PathVariable String tenantId) {
        return cargoRepo.findByTenantId(tenantId);
    }

    @PostMapping("/tenant/{tenantId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Cargo crear(@PathVariable String tenantId, @RequestBody Cargo cargo) {
        cargo.setId(UUID.randomUUID().toString());
        cargo.setTenantId(tenantId);
        return cargoRepo.save(cargo);
    }

    @PutMapping("/{id}")
    public Cargo actualizar(@PathVariable String id, @RequestBody Cargo cargo) {
        Cargo existing = cargoRepo.findById(id).orElseThrow();
        existing.setNombre(cargo.getNombre());
        existing.setDescripcion(cargo.getDescripcion());
        existing.setCodigo(cargo.getCodigo());
        existing.setSalarioBase(cargo.getSalarioBase());
        existing.setNivel(cargo.getNivel());
        existing.setAtributosExtra(cargo.getAtributosExtra());
        return cargoRepo.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable String id) {
        cargoRepo.deleteById(id);
    }
}

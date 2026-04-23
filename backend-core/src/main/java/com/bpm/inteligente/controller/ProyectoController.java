package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Proyecto;
import com.bpm.inteligente.service.ProyectoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proyectos")
@RequiredArgsConstructor
public class ProyectoController {

    private final ProyectoService proyectoService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Proyecto crear(@RequestBody Proyecto proyecto) {
        return proyectoService.crear(proyecto);
    }

    @PutMapping("/{id}")
    public Proyecto actualizar(@PathVariable String id, @RequestBody Proyecto proyecto) {
        return proyectoService.actualizar(id, proyecto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable String id) {
        proyectoService.eliminar(id);
    }

    @GetMapping("/{id}")
    public Proyecto buscarPorId(@PathVariable String id) {
        return proyectoService.buscarPorId(id);
    }

    @GetMapping("/tenant/{tenantId}")
    public List<Proyecto> listarPorTenant(@PathVariable String tenantId) {
        return proyectoService.listarPorTenant(tenantId);
    }
}

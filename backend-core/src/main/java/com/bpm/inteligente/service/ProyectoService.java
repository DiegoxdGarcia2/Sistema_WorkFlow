package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Proyecto;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.ProyectoRepository;
import com.bpm.inteligente.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProyectoService {

    private final ProyectoRepository proyectoRepo;
    private final TenantRepository tenantRepo;

    @Transactional
    public Proyecto crear(Proyecto proyecto) {
        if (!tenantRepo.existsById(proyecto.getTenantId())) {
            throw new ResourceNotFoundException("Tenant", "id", proyecto.getTenantId());
        }

        if (proyectoRepo.existsByTenantIdAndNombre(proyecto.getTenantId(), proyecto.getNombre())) {
            throw new BusinessRuleException(
                    "Ya existe un proyecto con el nombre '" + proyecto.getNombre() + "' en este tenant.");
        }

        proyecto.setId(UUID.randomUUID().toString());
        proyecto.setCreadoEn(Instant.now());
        proyecto.setActualizadoEn(Instant.now());
        return proyectoRepo.save(proyecto);
    }

    @Transactional
    public Proyecto actualizar(String proyectoId, Proyecto datos) {
        Proyecto existente = buscarPorId(proyectoId);
        existente.setNombre(datos.getNombre());
        existente.setDescripcion(datos.getDescripcion());
        existente.setColor(datos.getColor());
        existente.setResponsable(datos.getResponsable());
        existente.setEstado(datos.getEstado());
        existente.setActualizadoEn(Instant.now());
        return proyectoRepo.save(existente);
    }

    @Transactional
    public void eliminar(String proyectoId) {
        if (!proyectoRepo.existsById(proyectoId)) {
            throw new ResourceNotFoundException("Proyecto", "id", proyectoId);
        }
        proyectoRepo.deleteById(proyectoId);
    }

    public Proyecto buscarPorId(String id) {
        return proyectoRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proyecto", "id", id));
    }

    public List<Proyecto> listarPorTenant(String tenantId) {
        return proyectoRepo.findByTenantIdOrderByCreadoEnDesc(tenantId);
    }
}

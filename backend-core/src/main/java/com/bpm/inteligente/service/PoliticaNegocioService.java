package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Actividad;
import com.bpm.inteligente.domain.Calle;
import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.enums.TipoActividad;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.PoliticaNegocioRepository;
import com.bpm.inteligente.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoliticaNegocioService {

    private final PoliticaNegocioRepository politicaRepo;
    private final TenantRepository tenantRepo;

    /**
     * Crea una nueva política validando existencia del tenant
     * y coherencia mínima del grafo (al menos un INICIO y un FIN).
     */
    @Transactional
    public PoliticaNegocio crear(PoliticaNegocio politica) {
        // 1. Validar que el Tenant exista
        if (!tenantRepo.existsById(politica.getTenantId())) {
            throw new ResourceNotFoundException("Tenant", "id", politica.getTenantId());
        }

        // 2. Validar unicidad tenant + nombre + version
        if (politicaRepo.existsByTenantIdAndNombreAndVersion(
                politica.getTenantId(), politica.getNombre(), politica.getVersion())) {
            throw new BusinessRuleException(
                    String.format("Ya existe la política '%s' v%d para este tenant",
                            politica.getNombre(), politica.getVersion()));
        }

        // 3. Validar estructura del grafo
        validarEstructuraGrafo(politica);

        politica.setCreadoEn(Instant.now());
        politica.setActualizadoEn(Instant.now());
        return politicaRepo.save(politica);
    }

    /**
     * Actualiza la topología (calles, actividades, transiciones) de una política
     * que NO esté activa. Las políticas activas son inmutables.
     */
    @Transactional
    public PoliticaNegocio actualizar(String politicaId, PoliticaNegocio datosActualizados) {
        PoliticaNegocio existente = buscarPorId(politicaId);

        if (existente.isEstaActiva()) {
            throw new BusinessRuleException(
                    "No se puede modificar una política activa. Cree una nueva versión.");
        }

        existente.setNombre(datosActualizados.getNombre());
        existente.setDescripcion(datosActualizados.getDescripcion());
        existente.setCalles(datosActualizados.getCalles());
        existente.setTransiciones(datosActualizados.getTransiciones());

        validarEstructuraGrafo(existente);

        existente.setActualizadoEn(Instant.now());
        return politicaRepo.save(existente);
    }

    /**
     * Activa una política para que pueda generar trámites.
     * Valida la estructura del grafo antes de activar.
     */
    @Transactional
    public PoliticaNegocio activar(String politicaId) {
        PoliticaNegocio politica = buscarPorId(politicaId);
        validarEstructuraGrafo(politica);
        politica.setEstaActiva(true);
        politica.setActualizadoEn(Instant.now());
        return politicaRepo.save(politica);
    }

    public PoliticaNegocio buscarPorId(String id) {
        return politicaRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PoliticaNegocio", "id", id));
    }

    public List<PoliticaNegocio> listarPorTenant(String tenantId) {
        return politicaRepo.findByTenantId(tenantId);
    }

    public List<PoliticaNegocio> listarActivasPorTenant(String tenantId) {
        return politicaRepo.findByTenantIdAndEstaActiva(tenantId, true);
    }

    // ── Helpers privados ─────────────────────────────────────────

    /**
     * Valida que el grafo tenga al menos un nodo INICIO y un nodo FIN.
     */
    private void validarEstructuraGrafo(PoliticaNegocio politica) {
        List<Actividad> todasActividades = politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .toList();

        if (todasActividades.isEmpty()) {
            throw new BusinessRuleException("La política debe contener al menos una actividad.");
        }

        boolean tieneInicio = todasActividades.stream()
                .anyMatch(a -> a.getTipo() == TipoActividad.INICIO);
        boolean tieneFin = todasActividades.stream()
                .anyMatch(a -> a.getTipo() == TipoActividad.FIN);

        if (!tieneInicio) {
            throw new BusinessRuleException("La política debe tener al menos un nodo de tipo INICIO.");
        }
        if (!tieneFin) {
            throw new BusinessRuleException("La política debe tener al menos un nodo de tipo FIN.");
        }
    }
}

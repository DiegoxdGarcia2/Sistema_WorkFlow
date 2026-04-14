package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.domain.enums.TipoActividad;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TramiteService {

    private final TramiteRepository tramiteRepo;
    private final RegistroActividadRepository registroRepo;
    private final PoliticaNegocioService politicaService;

    /**
     * Instancia un nuevo Trámite a partir de una PoliticaNegocio activa.
     * Crea automáticamente el primer RegistroActividad en PENDIENTE
     * para la actividad INICIO de la política.
     */
    @Transactional
    public Tramite iniciar(String politicaId) {
        PoliticaNegocio politica = politicaService.buscarPorId(politicaId);

        if (!politica.isEstaActiva()) {
            throw new BusinessRuleException(
                    "No se puede iniciar un trámite de una política inactiva.");
        }

        // 1. Crear el trámite
        Tramite tramite = Tramite.builder()
                .politicaId(politicaId)
                .tenantId(politica.getTenantId())
                .estado(EstadoTramite.INICIADO)
                .build();
        tramite = tramiteRepo.save(tramite);

        // 2. Localizar la actividad inicial
        Actividad actividadInicial = buscarActividadInicial(politica);

        // 3. Crear el primer registro de actividad
        RegistroActividad primerRegistro = RegistroActividad.builder()
                .id(UUID.randomUUID().toString())
                .tramiteId(tramite.getId())
                .actividadId(actividadInicial.getId())
                .estado(EstadoRegistro.PENDIENTE)
                .build();
        registroRepo.save(primerRegistro);

        return tramite;
    }

    /**
     * Cambia el estado de un trámite a CANCELADO.
     */
    @Transactional
    public Tramite cancelar(String tramiteId) {
        Tramite tramite = buscarPorId(tramiteId);

        if (tramite.getEstado() == EstadoTramite.COMPLETADO ||
            tramite.getEstado() == EstadoTramite.CANCELADO) {
            throw new BusinessRuleException(
                    "No se puede cancelar un trámite que ya está " + tramite.getEstado());
        }

        tramite.setEstado(EstadoTramite.CANCELADO);
        tramite.setFinalizadoEn(java.time.Instant.now());
        return tramiteRepo.save(tramite);
    }

    public Tramite buscarPorId(String id) {
        return tramiteRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", id));
    }

    public List<Tramite> listarPorTenantYEstado(String tenantId, EstadoTramite estado) {
        return tramiteRepo.findByTenantIdAndEstado(tenantId, estado);
    }

    // ── Helpers ──────────────────────────────────────────────────

    private Actividad buscarActividadInicial(PoliticaNegocio politica) {
        return politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .filter(a -> a.getTipo() == TipoActividad.INICIO)
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "La política no tiene una actividad de tipo INICIO."));
    }
}

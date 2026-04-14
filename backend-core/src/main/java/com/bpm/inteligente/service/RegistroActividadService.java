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

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistroActividadService {

    private final RegistroActividadRepository registroRepo;
    private final TramiteRepository tramiteRepo;
    private final PoliticaNegocioService politicaService;

    /**
     * El funcionario toma una tarea pendiente y pasa a EN_PROGRESO.
     */
    @Transactional
    public RegistroActividad tomarTarea(String registroId, String userId) {
        RegistroActividad registro = buscarPorId(registroId);

        if (registro.getEstado() != EstadoRegistro.PENDIENTE) {
            throw new BusinessRuleException(
                    "Solo se pueden tomar tareas en estado PENDIENTE. Estado actual: " + registro.getEstado());
        }

        registro.setEjecutadoPor(userId);
        registro.setEstado(EstadoRegistro.EN_PROGRESO);
        return registroRepo.save(registro);
    }

    /**
     * El funcionario completa su tarea enviando el formulario dinámico.
     * Al marcarse como HECHO, el motor lee la siguiente transición
     * y genera automáticamente el siguiente RegistroActividad.
     *
     * Si la actividad destino es FIN, se marca el trámite como COMPLETADO.
     */
    @Transactional
    public RegistroActividad completarTarea(
            String registroId,
            Map<String, Object> esquemaFormulario,
            Map<String, Object> datosFormulario,
            String notas) {

        RegistroActividad registro = buscarPorId(registroId);

        // 1. Validar estado
        if (registro.getEstado() != EstadoRegistro.EN_PROGRESO) {
            throw new BusinessRuleException(
                    "Solo se pueden completar tareas EN_PROGRESO. Estado actual: " + registro.getEstado());
        }

        if (registro.getEjecutadoPor() == null) {
            throw new BusinessRuleException(
                    "La tarea debe tener un funcionario asignado antes de completarla.");
        }

        // 2. Guardar formulario dinámico y marcar como HECHO
        registro.setEsquemaFormulario(esquemaFormulario);
        registro.setDatosFormulario(datosFormulario);
        registro.setNotas(notas != null ? notas : "");
        registro.setEstado(EstadoRegistro.HECHO);
        registro.setCompletadoEn(Instant.now());
        registroRepo.save(registro);

        // 3. Motor de derivación: leer la política y avanzar
        Tramite tramite = tramiteRepo.findById(registro.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", registro.getTramiteId()));

        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());

        derivar(registro, tramite, politica);

        return registro;
    }

    public RegistroActividad buscarPorId(String id) {
        return registroRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RegistroActividad", "id", id));
    }

    public List<RegistroActividad> listarPorTramite(String tramiteId) {
        return registroRepo.findByTramiteId(tramiteId);
    }

    /**
     * Bandeja de tareas: obtener registros pendientes asignados a un funcionario.
     */
    public List<RegistroActividad> bandejaPendientes(String userId) {
        return registroRepo.findByEjecutadoPorAndEstado(userId, EstadoRegistro.PENDIENTE);
    }

    // ══════════════════════════════════════════════════════════════
    // Motor de Derivación (State Machine)
    // ══════════════════════════════════════════════════════════════

    /**
     * Lee las transiciones salientes de la actividad recién completada.
     * Para cada transición, crea un RegistroActividad PENDIENTE en el destino.
     * Si el destino es FIN, marca el trámite como COMPLETADO.
     */
    private void derivar(RegistroActividad registroCompletado, Tramite tramite, PoliticaNegocio politica) {
        String actividadOrigenId = registroCompletado.getActividadId();

        // Buscar transiciones salientes desde esta actividad
        List<Transicion> salientes = politica.getTransiciones().stream()
                .filter(t -> t.getOrigenId().equals(actividadOrigenId))
                .sorted((a, b) -> Integer.compare(a.getPrioridad(), b.getPrioridad()))
                .toList();

        if (salientes.isEmpty()) {
            // Sin transiciones salientes = nodo terminal implícito
            verificarCompletitudTramite(tramite);
            return;
        }

        // Actualizar trámite a EN_PROGRESO si estaba en INICIADO
        if (tramite.getEstado() == EstadoTramite.INICIADO) {
            tramite.setEstado(EstadoTramite.EN_PROGRESO);
            tramiteRepo.save(tramite);
        }

        boolean algunDestinoEsFin = false;

        for (Transicion transicion : salientes) {
            Actividad destino = buscarActividadEnPolitica(politica, transicion.getDestinoId());

            if (destino.getTipo() == TipoActividad.FIN) {
                algunDestinoEsFin = true;
                continue; // No se crea registro para nodos FIN
            }

            // Crear registro pendiente para la actividad destino
            RegistroActividad nuevoRegistro = RegistroActividad.builder()
                    .id(UUID.randomUUID().toString())
                    .tramiteId(tramite.getId())
                    .actividadId(destino.getId())
                    .estado(EstadoRegistro.PENDIENTE)
                    .build();
            registroRepo.save(nuevoRegistro);
        }

        // Si todas las transiciones llevan a FIN, completar el trámite
        if (algunDestinoEsFin && salientes.stream().allMatch(t ->
                buscarActividadEnPolitica(politica, t.getDestinoId()).getTipo() == TipoActividad.FIN)) {
            tramite.setEstado(EstadoTramite.COMPLETADO);
            tramite.setFinalizadoEn(Instant.now());
            tramiteRepo.save(tramite);
        }
    }

    /**
     * Verifica si todos los registros del trámite están en HECHO.
     * Si es así, marca el trámite como COMPLETADO.
     */
    private void verificarCompletitudTramite(Tramite tramite) {
        List<RegistroActividad> registros = registroRepo.findByTramiteId(tramite.getId());
        boolean todosHechos = registros.stream()
                .allMatch(r -> r.getEstado() == EstadoRegistro.HECHO);

        if (todosHechos) {
            tramite.setEstado(EstadoTramite.COMPLETADO);
            tramite.setFinalizadoEn(Instant.now());
            tramiteRepo.save(tramite);
        }
    }

    /**
     * Busca una actividad por ID dentro de todas las calles de la política.
     */
    private Actividad buscarActividadEnPolitica(PoliticaNegocio politica, String actividadId) {
        return politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .filter(a -> a.getId().equals(actividadId))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "Actividad '" + actividadId + "' no encontrada en la política '" + politica.getNombre() + "'"));
    }
}

package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.domain.enums.TipoActividad;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import com.bpm.inteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import com.bpm.inteligente.config.TenantContext;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegistroActividadService {

    private final RegistroActividadRepository registroRepo;
    private final TramiteRepository tramiteRepo;
    private final PoliticaNegocioService politicaService;
    private final UsuarioRepository usuarioRepo;
    private final DocumentoService documentoService;
    private final NotificationService notificationService;

    /**
     * El funcionario toma una tarea pendiente y pasa a EN_PROGRESO.
     */
    @Transactional
    public RegistroActividad tomarTarea(String registroId, String userId) {
        RegistroActividad registro = buscarPorId(registroId);

        if (registro.getEstado() != EstadoRegistro.PENDIENTE && 
            !(registro.getEstado() == EstadoRegistro.EN_PROGRESO && registro.getEjecutadoPor() == null)) {
            throw new BusinessRuleException(
                    "Solo se pueden tomar tareas en estado PENDIENTE o en progreso sin asignar. Estado actual: " + registro.getEstado());
        }

        Usuario user = usuarioRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        registro.setEjecutadoPorId(userId);
        registro.setEjecutadoPor(user.getNombre() + " " + user.getApellido());
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
            List<RegistroActividad.ArchivoInfo> archivos,
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
        registro.setArchivos(archivos != null ? archivos : new java.util.ArrayList<>());
        registro.setNotas(notas != null ? notas : "");
        registro.setEstado(EstadoRegistro.HECHO);
        registro.setCompletadoEn(Instant.now());
        registroRepo.save(registro);

        // Registrar documentos en el Repositorio Documental Versionado (MongoDB + S3 context)
        Usuario usuarioActual = null;
        try {
            String currentUserId = TenantContext.getCurrentUserId();
            if (currentUserId != null) {
                usuarioActual = usuarioRepo.findById(currentUserId).orElse(null);
            }
        } catch (Exception e) {
            log.warn("No se pudo obtener el usuario del contexto al registrar documentos: {}", e.getMessage());
        }

        // 1. Registrar archivos adjuntos generales
        if (archivos != null) {
            for (RegistroActividad.ArchivoInfo arch : archivos) {
                try {
                    documentoService.registrarDocumentoPreexistente(
                            registro.getTramiteId(),
                            arch.getNombre(),
                            arch.getId(),
                            arch.getTipo(),
                            usuarioActual
                    );
                } catch (Exception e) {
                    log.error("Error al registrar archivo adjunto en repositorio: {}", e.getMessage());
                }
            }
        }

        // 2. Registrar archivos dinámicos del formulario
        if (datosFormulario != null) {
            for (Map.Entry<String, Object> entry : datosFormulario.entrySet()) {
                Object val = entry.getValue();
                if (val instanceof Map) {
                    Map<?, ?> fileMap = (Map<?, ?>) val;
                    if (fileMap.containsKey("id") && fileMap.containsKey("nombre") && fileMap.containsKey("tipo")) {
                        try {
                            String fId = (String) fileMap.get("id");
                            String fNombre = (String) fileMap.get("nombre");
                            String fTipo = (String) fileMap.get("tipo");
                            
                            if (fId != null && !fId.trim().isEmpty() && !fId.startsWith("offline://")) {
                                documentoService.registrarDocumentoPreexistente(
                                        registro.getTramiteId(),
                                        fNombre,
                                        fId,
                                        fTipo,
                                        usuarioActual
                                );
                            }
                        } catch (Exception e) {
                            log.error("Error al registrar archivo de formulario dinámico en repositorio: {}", e.getMessage());
                        }
                    }
                }
            }
        }

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
     * Bandeja de tareas: obtener registros PENDIENTE + EN_PROGRESO asignados a un funcionario.
     */
    public List<RegistroActividad> bandejaPendientes(String userId) {
        // Buscamos tanto por ID como por nombre (para retrocompatibilidad si es necesario, 
        // pero principalmente por ID ahora)
        return registroRepo.findByEjecutadoPorIdAndEstadoIn(
                userId, List.of(EstadoRegistro.PENDIENTE, EstadoRegistro.EN_PROGRESO));
    }

    /**
     * Tareas sin asignar en estado PENDIENTE (disponibles para cualquier funcionario del tenant).
     */
    public List<RegistroActividad> tareasNoAsignadas() {
        return registroRepo.findByEjecutadoPorIsNullAndEstado(EstadoRegistro.PENDIENTE);
    }

    /**
     * Bandeja de tareas por departamento.
     */
    public List<RegistroActividad> bandejaPorDepartamento(String deptoId) {
        return registroRepo.findByDepartamentoIdAndEstadoIn(
                deptoId, List.of(EstadoRegistro.PENDIENTE, EstadoRegistro.EN_PROGRESO));
    }

    /**
     * Tareas sin asignar por departamento.
     */
    public List<RegistroActividad> tareasNoAsignadasPorDepartamento(String deptoId) {
        return registroRepo.findByDepartamentoIdAndEjecutadoPorIsNullAndEstado(deptoId, EstadoRegistro.PENDIENTE);
    }

    /**
     * Historial de tareas completadas por un usuario.
     */
    public List<RegistroActividad> historialPorUsuario(String userId) {
        return registroRepo.findByEjecutadoPorIdAndEstadoOrderByCompletadoEnDesc(userId, EstadoRegistro.HECHO);
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
            System.out.println("🔄 Derivación: Pasando trámite " + tramite.getId() + " a EN_PROGRESO");
            tramite.setEstado(EstadoTramite.EN_PROGRESO);
            tramiteRepo.save(tramite);

            notificationService.enviarNotificacionTramite(
                tramite,
                "TRAMITE_EN_PROGRESO",
                "Tu trámite '" + (politica != null ? politica.getNombre() : "Desconocido") + "' ahora está EN PROGRESO."
            );
        }

        boolean algunDestinoEsFin = false;

        for (Transicion transicion : salientes) {
            if (transicion.getDestinoId() == null) {
                System.err.println("⚠️ Derivación: Transición con destino nulo detectada en política " + politica.getId());
                continue;
            }

            Actividad destino = buscarActividadEnPolitica(politica, transicion.getDestinoId());

            if (destino.getTipo() == TipoActividad.FIN) {
                System.out.println("🏁 Derivación: Actividad destino es FIN para trámite " + tramite.getId());
                algunDestinoEsFin = true;
                continue; 
            }

            // Buscar a qué calle pertenece esta actividad para saber el departamento
            String deptoId = politica.getCalles().stream()
                    .filter(Objects::nonNull)
                    .filter(c -> c.getActividades() != null && c.getActividades().stream()
                            .anyMatch(a -> a != null && Objects.equals(a.getId(), destino.getId())))
                    .findFirst()
                    .map(Calle::getDepartamentoId)
                    .orElse(null);

            System.out.println("📤 Derivación: Creando registro PENDIENTE para actividad " + destino.getNombre() + " (Depto: " + deptoId + ")");

            // Crear registro pendiente para la actividad destino
            RegistroActividad nuevoRegistro = RegistroActividad.builder()
                    .id(UUID.randomUUID().toString())
                    .tramiteId(tramite.getId())
                    .tenantId(tramite.getTenantId())
                    .actividadId(destino.getId())
                    .actividadNombre(destino.getNombre())
                    .departamentoId(deptoId)
                    .estado(EstadoRegistro.PENDIENTE)
                    .asignadoEn(Instant.now())
                    .esquemaFormulario(destino.getEsquemaFormulario() != null ? destino.getEsquemaFormulario() : new java.util.HashMap<>())
                    .build();
            registroRepo.save(nuevoRegistro);

            notificationService.enviarNotificacionTramite(
                tramite,
                "TRAMITE_PASO_ACTUALIZADO",
                "Tu trámite '" + (politica != null ? politica.getNombre() : "Desconocido") + "' avanzó a la fase: " + destino.getNombre()
            );

            if (destino.getDocumentosRequeridos() != null && !destino.getDocumentosRequeridos().isEmpty()) {
                String docMsg = "Se requiere que subas los siguientes documentos para el paso '" + destino.getNombre() + "': " + String.join(", ", destino.getDocumentosRequeridos());
                notificationService.enviarNotificacionDocumentoRequerido(
                    tramite,
                    "DOCUMENTO_REQUERIDO_PASO",
                    docMsg,
                    destino.getDocumentosRequeridos(),
                    destino.getNombre()
                );
            }
        }

        // Si todas las transiciones llevan a FIN, completar el trámite
        if (algunDestinoEsFin && salientes.stream().allMatch(t ->
                buscarActividadEnPolitica(politica, t.getDestinoId()).getTipo() == TipoActividad.FIN)) {
            
            compilarBorradorSiExiste(tramite.getId());

            tramite.setEstado(EstadoTramite.COMPLETADO);
            tramite.setFinalizadoEn(Instant.now());
            Tramite saved = tramiteRepo.save(tramite);

            notificationService.enviarNotificacionTramite(
                saved,
                "TRAMITE_COMPLETADO",
                "¡Tu trámite '" + (politica != null ? politica.getNombre() : "Desconocido") + "' ha sido COMPLETADO con éxito!"
            );
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
            
            compilarBorradorSiExiste(tramite.getId());

            tramite.setEstado(EstadoTramite.COMPLETADO);
            tramite.setFinalizadoEn(Instant.now());
            Tramite saved = tramiteRepo.save(tramite);

            try {
                PoliticaNegocio politica = politicaService.buscarPorId(saved.getPoliticaId());
                notificationService.enviarNotificacionTramite(
                    saved,
                    "TRAMITE_COMPLETADO",
                    "¡Tu trámite '" + (politica != null ? politica.getNombre() : "Desconocido") + "' ha sido COMPLETADO con éxito!"
                );
            } catch (Exception e) {
                System.err.println("Error al enviar notificación de completitud de trámite: " + e.getMessage());
            }
        }
    }

    private void compilarBorradorSiExiste(String tramiteId) {
        try {
            String currentUserId = TenantContext.getCurrentUserId();
            Usuario supervisor = null;
            if (currentUserId != null) {
                supervisor = usuarioRepo.findById(currentUserId).orElse(null);
            }
            documentoService.compilarYArchivarDocumentoBorrador(tramiteId, supervisor);
            log.info("Borrador compilador/archivador invocado con éxito para tramite {}", tramiteId);
        } catch (ResourceNotFoundException rnfe) {
            log.debug("No se encontró borrador para el trámite {}, omitiendo compilación.", tramiteId);
        } catch (Exception e) {
            log.error("Error al compilar y archivar borrador al finalizar tramite {}: {}", tramiteId, e.getMessage());
        }
    }

    /**
     * Busca una actividad por ID dentro de todas las calles de la política.
     */
    private Actividad buscarActividadEnPolitica(PoliticaNegocio politica, String actividadId) {
        if (actividadId == null) {
            throw new BusinessRuleException("Se intentó buscar una actividad con ID nulo");
        }
        return politica.getCalles().stream()
                .filter(Objects::nonNull)
                .flatMap(c -> c.getActividades() != null ? c.getActividades().stream() : java.util.stream.Stream.empty())
                .filter(Objects::nonNull)
                .filter(a -> Objects.equals(a.getId(), actividadId))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(
                        "Actividad '" + actividadId + "' no encontrada en la política '" + (politica != null ? politica.getNombre() : "null") + "'"));
    }
}

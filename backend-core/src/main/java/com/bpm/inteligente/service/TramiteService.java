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
    private final com.bpm.inteligente.repository.DepartamentoRepository deptoRepo;
    private final com.bpm.inteligente.repository.UsuarioRepository usuarioRepo;
    private final com.bpm.inteligente.repository.ClienteRepository clienteRepo;
    private final NotificationService notificationService;

    /**
     * Instancia un nuevo Trámite a partir de una PoliticaNegocio activa.
     * Crea automáticamente el primer RegistroActividad en PENDIENTE
     * para la actividad INICIO de la política.
     */
    @Transactional
    public Tramite iniciar(String politicaId, String usuarioId, String clienteId, String documentoCliente, String clienteNombre) {
        return iniciar(politicaId, usuarioId, clienteId, documentoCliente, clienteNombre, null);
    }

    @Transactional
    public Tramite iniciar(String politicaId, String usuarioId, String clienteId, String documentoCliente, String clienteNombre, List<RegistroActividad.ArchivoInfo> archivosIniciales) {
        PoliticaNegocio politica = politicaService.buscarPorId(politicaId);
        Usuario usuario = usuarioRepo.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", usuarioId));

        if (!politica.isEstaActiva()) {
            throw new BusinessRuleException(
                    "No se puede iniciar un trámite de una política inactiva.");
        }

        // 1. Validar que el usuario que inicia coincide con el usuario autenticado (prevención de spoofing de usuario)
        String authenticatedUserId = com.bpm.inteligente.config.TenantContext.getCurrentUserId();
        if (authenticatedUserId != null && !authenticatedUserId.equals(usuarioId)) {
            // Permitir solo a ADMINISTRADOR iniciar en nombre de otros
            Usuario authUser = usuarioRepo.findById(authenticatedUserId).orElse(null);
            if (authUser == null || (authUser.getRol() != com.bpm.inteligente.domain.enums.RolUsuario.ADMINISTRADOR)) {
                throw new BusinessRuleException("No tiene permisos para iniciar un trámite en nombre de otro usuario.");
            }
        }

        boolean isCliente = usuario.getRol() == com.bpm.inteligente.domain.enums.RolUsuario.CLIENTE;

        // 2. Localizar la actividad inicial y su departamento
        Actividad actividadInicial = buscarActividadInicial(politica);
        Calle calleInicial = buscarCalleDeActividad(politica, actividadInicial.getId());
        String deptoId = calleInicial != null ? calleInicial.getDepartamentoId() : null;

        if (isCliente) {
            // Prevenir spoofing de cliente
            if (usuario.getClienteId() == null) {
                throw new BusinessRuleException("El usuario cliente no tiene un cliente asociado.");
            }
            if (!usuario.getClienteId().equals(clienteId)) {
                throw new BusinessRuleException("No tiene permisos para iniciar un trámite en nombre de otro cliente.");
            }

            // Enmascarar/recuperar datos correctos del cliente del repositorio para evitar spoofing
            Cliente clienteObj = clienteRepo.findById(usuario.getClienteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente", "id", usuario.getClienteId()));
            
            clienteNombre = clienteObj.getNombre() + " " + (clienteObj.getApellido() != null ? clienteObj.getApellido() : "");
            documentoCliente = clienteObj.getCi() != null ? clienteObj.getCi() : "";

            // Validar que la calle/departamento inicial sea de cara al cliente (evitar iniciar flujos internos)
            boolean esClienteFacing = false;
            if (calleInicial != null) {
                String laneName = calleInicial.getNombre().toLowerCase();
                String deptoName = "";
                if (deptoId != null) {
                    Departamento depto = deptoRepo.findById(deptoId).orElse(null);
                    if (depto != null) {
                        deptoName = depto.getNombre().toLowerCase();
                    }
                }
                
                java.util.List<String> keywords = java.util.Arrays.asList(
                    "atencion", "atención", "cliente", "ventanilla", "partes", "comercial", "venta", "plataforma", "public", "públic"
                );
                
                for (String kw : keywords) {
                    if (laneName.contains(kw) || deptoName.contains(kw)) {
                        esClienteFacing = true;
                        break;
                    }
                }
            }
            
            if (!esClienteFacing) {
                throw new BusinessRuleException("No tiene permisos para iniciar este proceso. Este trámite es de carácter interno.");
            }
        } else {
            // Validar que el usuario pertenezca al departamento inicial (solo para personal interno)
            if (deptoId == null) {
                throw new BusinessRuleException("No se puede iniciar el trámite porque la calle inicial no tiene un departamento asignado en el Diseñador.");
            }
            if (!deptoId.equals(usuario.getDepartamentoId()) && usuario.getRol() != com.bpm.inteligente.domain.enums.RolUsuario.ADMINISTRADOR) {
                throw new BusinessRuleException("No tiene permisos para iniciar este proceso. " +
                        "Este trámite debe ser iniciado por personal de: " + (calleInicial != null ? calleInicial.getNombre() : "Desconocido"));
            }
        }

        // Generar un código de seguimiento único corto y amigable (ej. IME-58472)
        String initials = getPolicyInitials(politica.getNombre());
        String randomDigits = String.format("%05d", new java.util.Random().nextInt(100000));
        String code = initials + "-" + randomDigits;
        while (tramiteRepo.existsByCodigoSeguimiento(code)) {
            randomDigits = String.format("%05d", new java.util.Random().nextInt(100000));
            code = initials + "-" + randomDigits;
        }

        // 3. Crear el trámite con datos del cliente si vienen (o datos seguros recuperados del cliente)
        Tramite tramite = Tramite.builder()
                .politicaId(politicaId)
                .tenantId(politica.getTenantId())
                .codigoSeguimiento(code)
                .estado(EstadoTramite.INICIADO)
                .clienteId(clienteId)
                .documentoCliente(documentoCliente)
                .clienteNombre(clienteNombre)
                .build();
        tramite = tramiteRepo.save(tramite);

        // 4. Crear el primer registro de actividad
        RegistroActividad primerRegistro = RegistroActividad.builder()
                .id(UUID.randomUUID().toString())
                .tramiteId(tramite.getId())
                .tenantId(tramite.getTenantId())
                .actividadId(actividadInicial.getId())
                .actividadNombre(actividadInicial.getNombre())
                .departamentoId(deptoId)
                .estado(isCliente ? EstadoRegistro.PENDIENTE : EstadoRegistro.EN_PROGRESO)
                .asignadoEn(java.time.Instant.now())
                .ejecutadoPorId(isCliente ? null : usuario.getId())
                .ejecutadoPor(isCliente ? null : (usuario.getNombre() + " " + (usuario.getApellido() != null ? usuario.getApellido() : "")))
                .archivos(archivosIniciales != null ? archivosIniciales : new java.util.ArrayList<>())
                .build();
        registroRepo.save(primerRegistro);

        // Notificar inicio del trámite
        notificationService.enviarNotificacionTramite(
                tramite,
                "TRAMITE_INICIADO",
                "Tu trámite de '" + politica.getNombre() + "' ha sido iniciado con éxito."
        );

        if (politica.getRequisitosIniciales() != null && !politica.getRequisitosIniciales().isEmpty()) {
            String reqMsg = "Se requiere que subas los siguientes documentos de prerrequisitos: " + String.join(", ", politica.getRequisitosIniciales());
            notificationService.enviarNotificacionDocumentoRequerido(
                    tramite,
                    "PREREQUISITOS_REQUERIDOS",
                    reqMsg,
                    politica.getRequisitosIniciales(),
                    null
            );
        }

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

        // 1. Cancelar todos los registros pendientes para que no aparezcan en las bandejas
        List<RegistroActividad> registros = registroRepo.findByTramiteId(tramiteId);
        for (RegistroActividad r : registros) {
            if (r.getEstado() == EstadoRegistro.PENDIENTE || r.getEstado() == EstadoRegistro.EN_PROGRESO) {
                r.setEstado(EstadoRegistro.CANCELADO);
                r.setCompletadoEn(java.time.Instant.now());
                String currentNotas = r.getNotas() != null ? r.getNotas() : "";
                r.setNotas(currentNotas + " [Proceso Cancelado por Administrador]");
                registroRepo.save(r);
            }
        }

        // 2. Cancelar el trámite
        tramite.setEstado(EstadoTramite.CANCELADO);
        tramite.setFinalizadoEn(java.time.Instant.now());
        Tramite saved = tramiteRepo.save(tramite);

        try {
            PoliticaNegocio politica = politicaService.buscarPorId(saved.getPoliticaId());
            notificationService.enviarNotificacionTramite(
                saved,
                "TRAMITE_CANCELADO",
                "Tu trámite '" + (politica != null ? politica.getNombre() : "Desconocido") + "' ha sido CANCELADO."
            );
        } catch (Exception e) {
            System.err.println("Error al enviar notificación de cancelación: " + e.getMessage());
        }

        return saved;
    }

    public Tramite buscarPorId(String id) {
        return tramiteRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", id));
    }

    public List<Tramite> buscarTrackingPorTermino(String termino) {
        // 1. Buscar en Cliente por término (nombre, apellido, CI, correo)
        List<com.bpm.inteligente.domain.Cliente> clientesMatch = clienteRepo.buscarPorTermino(null, termino);
        List<String> clienteIds = clientesMatch.stream().map(com.bpm.inteligente.domain.Cliente::getId).toList();

        // 2. Buscar trámites que coincidan con los IDs de cliente, el nombre de cliente guardado, 
        //    el documento guardado, el propio ID del trámite (código de seguimiento), o el número de trámite.
        // Como no tenemos una consulta compleja en Mongo, usamos findAll y filtramos, 
        // o podemos hacer un par de consultas y juntarlas. Mejor traer los que coinciden.
        
        List<Tramite> resultado = new java.util.ArrayList<>();
        
        // Trámite por ID exacto (código seguimiento)
        tramiteRepo.findById(termino).ifPresent(resultado::add);
        
        // Trámites por ID de cliente
        if (!clienteIds.isEmpty()) {
            List<Tramite> porClienteId = tramiteRepo.findAll().stream()
                    .filter(t -> clienteIds.contains(t.getClienteId()))
                    .toList();
            for (Tramite t : porClienteId) {
                if (resultado.stream().noneMatch(r -> r.getId().equals(t.getId()))) {
                    resultado.add(t);
                }
            }
        }
        
        // Trámites por nombre o CI guardados directamente en el documento (por si se creó sin ID de cliente asociado)
        List<Tramite> porDatos = tramiteRepo.findAll().stream()
                .filter(t -> (t.getDocumentoCliente() != null && t.getDocumentoCliente().toLowerCase().contains(termino.toLowerCase())) ||
                             (t.getClienteNombre() != null && t.getClienteNombre().toLowerCase().contains(termino.toLowerCase())))
                .toList();
        
        for (Tramite t : porDatos) {
            if (resultado.stream().noneMatch(r -> r.getId().equals(t.getId()))) {
                resultado.add(t);
            }
        }

        return resultado;
    }

    public List<Tramite> listarPorTenantYEstado(String tenantId, EstadoTramite estado) {
        return tramiteRepo.findByTenantIdAndEstado(tenantId, estado);
    }

    public List<Tramite> buscarPorClienteId(String clienteId) {
        return tramiteRepo.findByClienteId(clienteId);
    }

    /**
     * Obtiene datos enriquecidos para el monitor visual de trámites activos.
     */
    public List<com.bpm.inteligente.dto.MonitorTramiteDTO> obtenerMonitorTramites(String tenantId) {
        List<Tramite> activos = tramiteRepo.findByTenantIdAndEstado(tenantId, EstadoTramite.EN_PROGRESO);
        activos.addAll(tramiteRepo.findByTenantIdAndEstado(tenantId, EstadoTramite.INICIADO));
        return mappingMonitor(activos);
    }

    public List<com.bpm.inteligente.dto.MonitorTramiteDTO> obtenerHistorialTramites(String tenantId) {
        List<Tramite> historial = tramiteRepo.findByTenantIdAndEstado(tenantId, EstadoTramite.COMPLETADO);
        historial.addAll(tramiteRepo.findByTenantIdAndEstado(tenantId, EstadoTramite.CANCELADO));
        return mappingMonitor(historial);
    }

    private List<com.bpm.inteligente.dto.MonitorTramiteDTO> mappingMonitor(List<Tramite> lista) {
        // Optimización: Cachear políticas y departamentos en memoria para evitar el problema N+1
        java.util.Map<String, PoliticaNegocio> politicasCache = new java.util.HashMap<>();
        java.util.Map<String, Departamento> deptosCache = new java.util.HashMap<>();

        return lista.stream().map(t -> {
            try {
                // Obtener Política con caché
                PoliticaNegocio p = politicasCache.computeIfAbsent(t.getPoliticaId(), id -> {
                    try { return politicaService.buscarPorId(id); }
                    catch (Exception e) { return null; }
                });
                
                if (p == null) throw new RuntimeException("Politica no encontrada");

                List<RegistroActividad> regs = registroRepo.findByTramiteId(t.getId());
                
                List<com.bpm.inteligente.dto.MonitorTramiteDTO.PasoActual> pasos = regs.stream().map(r -> {
                    Calle calle = buscarCalleDeActividad(p, r.getActividadId());
                    Actividad act = buscarActividadEnCalle(calle, r.getActividadId());
                    
                    Departamento dep = null;
                    if (calle != null && calle.getDepartamentoId() != null) {
                        dep = deptosCache.computeIfAbsent(calle.getDepartamentoId(), id -> 
                            deptoRepo.findById(id).orElse(null)
                        );
                    }
                    
                    return com.bpm.inteligente.dto.MonitorTramiteDTO.PasoActual.builder()
                            .registroId(r.getId())
                            .actividadId(r.getActividadId())
                            .actividadNombre(act != null ? act.getNombre() : "N/A")
                            .departamentoNombre(dep != null ? dep.getNombre() : "N/A")
                            .asignadoA(r.getEjecutadoPor())
                            .asignadoEn(r.getAsignadoEn())
                            .estado(r.getEstado() != null ? r.getEstado().name() : "PENDIENTE")
                            .build();
                }).toList();

                return com.bpm.inteligente.dto.MonitorTramiteDTO.builder()
                        .tramiteId(t.getId())
                        .politicaId(t.getPoliticaId())
                        .politicaNombre(p.getNombre())
                        .iniciadoEn(t.getIniciadoEn())
                        .finalizadoEn(t.getFinalizadoEn())
                        .estadoGeneral(t.getEstado() != null ? t.getEstado().name() : "INICIADO")
                        .pasosActuales(pasos)
                        .build();
            } catch (Exception e) {
                // Si falla un trámite específico, lo omitimos o enviamos info mínima
                return com.bpm.inteligente.dto.MonitorTramiteDTO.builder()
                        .tramiteId(t.getId())
                        .politicaNombre("Política no encontrada o Error")
                        .estadoGeneral(t.getEstado() != null ? t.getEstado().name() : "ERROR")
                        .pasosActuales(new java.util.ArrayList<>())
                        .build();
            }
        }).toList();
    }

    private Calle buscarCalleDeActividad(PoliticaNegocio p, String actId) {
        if (p.getCalles() == null) return null;
        return p.getCalles().stream()
                .filter(c -> c.getActividades() != null && c.getActividades().stream().anyMatch(a -> actId != null && actId.equals(a.getId())))
                .findFirst()
                .orElse(null);
    }

    private Actividad buscarActividadEnCalle(Calle calle, String actId) {
        if (calle == null || calle.getActividades() == null) return null;
        return calle.getActividades().stream()
                .filter(a -> actId != null && actId.equals(a.getId()))
                .findFirst()
                .orElse(null);
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

    private String getPolicyInitials(String nombre) {
        if (nombre == null || nombre.trim().isEmpty()) {
            return "TR";
        }
        StringBuilder initials = new StringBuilder();
        for (String word : nombre.split("\\s+")) {
            if (!word.isEmpty() && Character.isUpperCase(word.charAt(0))) {
                initials.append(word.charAt(0));
            } else if (!word.isEmpty() && word.length() > 2) {
                initials.append(Character.toUpperCase(word.charAt(0)));
            }
        }
        String res = initials.toString().replaceAll("[^A-Z]", "");
        if (res.length() > 4) {
            res = res.substring(0, 4);
        }
        return res.isEmpty() ? "TR" : res;
    }
}

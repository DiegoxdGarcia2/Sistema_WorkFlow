package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.AccionDocumento;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.DocumentoVersionadoRepository;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentoService {

    private final DocumentoVersionadoRepository documentoRepo;
    private final TramiteRepository tramiteRepo;
    private final RegistroActividadRepository registroRepo;
    private final PoliticaNegocioService politicaService;
    private final S3StorageService s3StorageService;

    /**
     * Sube un nuevo documento a S3 y lo registra en MongoDB.
     */
    @Transactional
    public DocumentoVersionado subirDocumento(String tramiteId, String nombreOriginal, byte[] contenido, String contentType, Usuario usuario) {
        log.info("Subiendo documento: {} para el tramite: {}", nombreOriginal, tramiteId);
        
        Tramite tramite = tramiteRepo.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        // 1. Validar el aislamiento multi-tenant
        validarMultiTenant(tramite, usuario);

        // 2. Validar acceso dinámico por "Calles"
        validarAccesoCalleActiva(tramite, usuario);

        // 3. Crear key de almacenamiento S3
        // s3://bucket-bpm/tenants/{tenantId}/clientes/{clienteId}/politicas/{politicaId}/tramites/{tramiteId}/v1_{nombreOriginal}
        String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
        String s3Key = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/v1_%s",
                tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), nombreOriginal);

        // 4. Subir a S3
        s3StorageService.uploadFile(s3Key, contenido, contentType);

        // 5. Registrar en MongoDB
        DocumentoVersionado.Revision revision = DocumentoVersionado.Revision.builder()
                .version(1)
                .s3Key(s3Key)
                .s3Url(s3StorageService.generatePresignedUrl(s3Key))
                .accion(AccionDocumento.CREACION)
                .usuarioId(usuario.getId())
                .usuarioNombre(usuario.getNombre() + " " + usuario.getApellido())
                .rolUsuario(usuario.getRol())
                .timestamp(Instant.now())
                .build();

        DocumentoVersionado documento = DocumentoVersionado.builder()
                .id(UUID.randomUUID().toString())
                .tramiteId(tramiteId)
                .tenantId(tramite.getTenantId())
                .nombreOriginal(nombreOriginal)
                .versionActual(1)
                .historial(new ArrayList<>(List.of(revision)))
                .creadoEn(Instant.now())
                .actualizadoEn(Instant.now())
                .build();

        return documentoRepo.save(documento);
    }

    /**
     * Sube una nueva versión de un documento ya existente.
     */
    @Transactional
    public DocumentoVersionado subirNuevaVersion(String documentoId, byte[] contenido, String contentType, Usuario usuario) {
        log.info("Subiendo nueva versión del documento ID: {}", documentoId);

        DocumentoVersionado documento = documentoRepo.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoVersionado", "id", documentoId));

        Tramite tramite = tramiteRepo.findById(documento.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", documento.getTramiteId()));

        // 1. Validar el aislamiento multi-tenant
        validarMultiTenant(tramite, usuario);

        // 2. Validar acceso dinámico por "Calles"
        validarAccesoCalleActiva(tramite, usuario);

        int nuevaVersion = documento.getVersionActual() + 1;
        String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
        String s3Key = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/v%d_%s",
                tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), nuevaVersion, documento.getNombreOriginal());

        // 3. Subir nueva versión a S3
        s3StorageService.uploadFile(s3Key, contenido, contentType);

        // 4. Actualizar MongoDB
        DocumentoVersionado.Revision revision = DocumentoVersionado.Revision.builder()
                .version(nuevaVersion)
                .s3Key(s3Key)
                .s3Url(s3StorageService.generatePresignedUrl(s3Key))
                .accion(AccionDocumento.MODIFICACION)
                .usuarioId(usuario.getId())
                .usuarioNombre(usuario.getNombre() + " " + usuario.getApellido())
                .rolUsuario(usuario.getRol())
                .timestamp(Instant.now())
                .build();

        documento.setVersionActual(nuevaVersion);
        documento.getHistorial().add(revision);
        documento.setActualizadoEn(Instant.now());

        return documentoRepo.save(documento);
    }

    /**
     * Lista todos los documentos activos de un trámite específico.
     */
    public List<DocumentoVersionado> listarDocumentos(String tramiteId, Usuario usuario) {
        Tramite tramite = tramiteRepo.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        validarAccesoConsulta(tramite, usuario);

        // Retorna todos los documentos con estado "ACTIVO"
        return documentoRepo.findByTramiteIdAndEstado(tramiteId, "ACTIVO");
    }

    /**
     * Obtiene el historial completo de revisiones de un documento.
     */
    public List<DocumentoVersionado.Revision> obtenerHistorial(String documentoId, Usuario usuario) {
        DocumentoVersionado documento = documentoRepo.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoVersionado", "id", documentoId));

        Tramite tramite = tramiteRepo.findById(documento.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", documento.getTramiteId()));

        validarAccesoConsulta(tramite, usuario);

        return documento.getHistorial();
    }

    /**
     * Genera una URL prefirmada temporal para descargar/visualizar la versión de un documento.
     */
    public String obtenerUrlVistaPrevia(String documentoId, int version, Usuario usuario) {
        DocumentoVersionado documento = documentoRepo.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoVersionado", "id", documentoId));

        Tramite tramite = tramiteRepo.findById(documento.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", documento.getTramiteId()));

        validarAccesoConsulta(tramite, usuario);

        DocumentoVersionado.Revision revision = documento.getHistorial().stream()
                .filter(r -> r.getVersion() == version)
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException(String.format("La versión %d no existe para este documento", version)));

        // Registrar auditoría de lectura (opcional pero recomendado para el estándar Enterprise)
        log.info("Usuario {} ({}) leyó documento ID: {}, versión: {}", usuario.getEmail(), usuario.getRol(), documentoId, version);

        return s3StorageService.generatePresignedUrl(revision.getS3Key());
    }

    /**
     * Elimina lógicamente un documento del trámite.
     */
    @Transactional
    public DocumentoVersionado eliminarDocumento(String documentoId, Usuario usuario) {
        DocumentoVersionado documento = documentoRepo.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoVersionado", "id", documentoId));

        Tramite tramite = tramiteRepo.findById(documento.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", documento.getTramiteId()));

        validarMultiTenant(tramite, usuario);
        validarAccesoCalleActiva(tramite, usuario);

        documento.setEstado("ELIMINADO");
        documento.setActualizadoEn(Instant.now());

        DocumentoVersionado.Revision revision = DocumentoVersionado.Revision.builder()
                .version(documento.getVersionActual())
                .s3Key("")
                .s3Url("")
                .accion(AccionDocumento.ELIMINACION_LOGICA)
                .usuarioId(usuario.getId())
                .usuarioNombre(usuario.getNombre() + " " + usuario.getApellido())
                .rolUsuario(usuario.getRol())
                .timestamp(Instant.now())
                .build();
        documento.getHistorial().add(revision);

        return documentoRepo.save(documento);
    }

    /**
     * Registra un documento pre-existente en AWS S3 en MongoDB.
     */
    @Transactional
    public DocumentoVersionado registrarDocumentoPreexistente(
            String tramiteId, 
            String nombreOriginal, 
            String s3Key, 
            String contentType, 
            Usuario usuario) {
        log.info("Registrando documento S3 preexistente: {} para el tramite: {}", nombreOriginal, tramiteId);
        
        Tramite tramite = tramiteRepo.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        if (usuario != null) {
            validarMultiTenant(tramite, usuario);
        }

        DocumentoVersionado.Revision revision = DocumentoVersionado.Revision.builder()
                .version(1)
                .s3Key(s3Key)
                .s3Url(s3StorageService.generatePresignedUrl(s3Key))
                .accion(AccionDocumento.CREACION)
                .usuarioId(usuario != null ? usuario.getId() : "sistema")
                .usuarioNombre(usuario != null ? (usuario.getNombre() + " " + usuario.getApellido()) : "Sistema")
                .rolUsuario(usuario != null ? usuario.getRol() : null)
                .timestamp(Instant.now())
                .build();

        DocumentoVersionado documento = DocumentoVersionado.builder()
                .id(UUID.randomUUID().toString())
                .tramiteId(tramiteId)
                .tenantId(tramite.getTenantId())
                .nombreOriginal(nombreOriginal)
                .versionActual(1)
                .historial(new ArrayList<>(List.of(revision)))
                .creadoEn(Instant.now())
                .actualizadoEn(Instant.now())
                .estado("ACTIVO")
                .build();

        return documentoRepo.save(documento);
    }

    // ── Validaciones de Acceso y Aislamiento ──────────────────────────────────────────

    private void validarMultiTenant(Tramite tramite, Usuario usuario) {
        if (!Objects.equals(tramite.getTenantId(), usuario.getTenantId())) {
            throw new BusinessRuleException("Acceso denegado: El trámite no pertenece al tenant del usuario actual.");
        }
    }

    private void validarAccesoConsulta(Tramite tramite, Usuario usuario) {
        validarMultiTenant(tramite, usuario);

        // Si el usuario es CLIENTE, solo puede consultar si es el dueño del trámite
        if (usuario.getRol() == RolUsuario.CLIENTE) {
            if (!Objects.equals(tramite.getClienteId(), usuario.getClienteId())) {
                throw new BusinessRuleException("Acceso denegado: El cliente no es propietario de este trámite.");
            }
        }
    }

    /**
     * Valida dinámicamente si el usuario pertenece al departamento/rol de la "Calle"
     * activa del flujo en este momento.
     */
    private void validarAccesoCalleActiva(Tramite tramite, Usuario usuario) {
        // El administrador está exceptuado del bloqueo
        if (usuario.getRol() == RolUsuario.ADMINISTRADOR) {
            return;
        }

        // 1. Obtener los registros de actividad actualmente activos en el trámite (PENDIENTE o EN_PROGRESO)
        List<RegistroActividad> registrosActivos = registroRepo.findByTramiteId(tramite.getId()).stream()
                .filter(r -> r.getEstado() == EstadoRegistro.PENDIENTE || r.getEstado() == EstadoRegistro.EN_PROGRESO)
                .toList();

        if (registrosActivos.isEmpty()) {
            throw new BusinessRuleException("No hay actividades activas actualmente en este trámite.");
        }

        // 2. Cargar la política de negocio para inspeccionar las calles
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());

        // 3. Validar si el usuario pertenece al departamento asociado a la calle activa de al menos una actividad
        boolean tienePermiso = false;
        for (RegistroActividad registro : registrosActivos) {
            String actId = registro.getActividadId();

            Calle calleActiva = politica.getCalles().stream()
                    .filter(c -> c.getActividades() != null && c.getActividades().stream().anyMatch(a -> Objects.equals(a.getId(), actId)))
                    .findFirst()
                    .orElse(null);

            if (calleActiva != null) {
                // Si la calle no requiere departamento específico, cualquiera con permisos de funcionario puede subir
                if (calleActiva.getDepartamentoId() == null || calleActiva.getDepartamentoId().trim().isEmpty()) {
                    tienePermiso = true;
                    break;
                }
                
                // Si coincide el departamentoId del usuario con el de la calle, se permite
                if (Objects.equals(calleActiva.getDepartamentoId(), usuario.getDepartamentoId())) {
                    tienePermiso = true;
                    break;
                }
            }
        }

        if (!tienePermiso) {
            throw new BusinessRuleException("No autorizado: Tu departamento no pertenece a la calle activa de este trámite.");
        }
    }
}

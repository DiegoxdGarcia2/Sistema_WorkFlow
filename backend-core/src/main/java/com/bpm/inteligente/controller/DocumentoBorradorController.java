package com.bpm.inteligente.controller;

import com.bpm.inteligente.config.TenantContext;
import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.repository.*;
import com.bpm.inteligente.service.PoliticaNegocioService;
import com.bpm.inteligente.service.AuditService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/documentos-borradores")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentoBorradorController {

    private final DocumentoBorradorRepository repository;
    private final TramiteRepository tramiteRepository;
    private final UsuarioRepository usuarioRepository;
    private final PoliticaNegocioService politicaService;
    private final RegistroActividadRepository registroRepo;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    @Data
    public static class GuardarBorradorDTO {
        private String contenidoHtml;
        private String estadoBinarioYjsBase64;
        private String nombre;
    }

    @GetMapping("/tramite/{tramiteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO', 'CLIENTE')")
    public ResponseEntity<DocumentoBorrador> getOrCreateDraft(@PathVariable String tramiteId) {
        String userId = TenantContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        // Validar tenant
        if (!Objects.equals(tramite.getTenantId(), usuario.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Si el usuario es CLIENTE, solo puede ver el borrador si es el propietario
        if (usuario.getRol() == RolUsuario.CLIENTE) {
            if (!Objects.equals(tramite.getClienteId(), usuario.getClienteId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        Optional<DocumentoBorrador> draftOpt = repository.findByTramiteId(tramiteId);
        if (draftOpt.isPresent()) {
            return ResponseEntity.ok(draftOpt.get());
        }

        // Crear borrador inicial
        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());
        String clienteNombre = tramite.getClienteNombre() != null && !tramite.getClienteNombre().trim().isEmpty()
                ? tramite.getClienteNombre() : "Cliente Desconocido";

        String templateHtml = String.format(
                "<h1>Borrador de Trámite: %s</h1>" +
                "<p><strong>Cliente:</strong> %s</p>" +
                "<p><strong>Trámite ID:</strong> %s</p>" +
                "<p>Comienza a redactar el borrador colaborativo aquí...</p>",
                politica.getNombre(), clienteNombre, tramiteId
        );

        DocumentoBorrador borrador = DocumentoBorrador.builder()
                .tramiteId(tramiteId)
                .tenantId(tramite.getTenantId())
                .contenidoHtml(templateHtml)
                .estadoBinarioYjs(new byte[0])
                .actualizadoEn(Instant.now())
                .modificadoPor(usuario.getNombre() + " " + usuario.getApellido())
                .archivado(false)
                .build();

        borrador = repository.save(borrador);
        log.info("Creado borrador colaborativo para trámite ID: {}", tramiteId);

        auditService.registrar(
                tramite.getTenantId(),
                usuario.getId(),
                usuario.getNombre() + " " + usuario.getApellido(),
                "CREACION_BORRADOR",
                "DocumentoBorrador",
                tramiteId,
                "Creación del borrador inicial de documento para el trámite del cliente: " + clienteNombre
        );

        return ResponseEntity.ok(borrador);
    }

    @PutMapping("/tramite/{tramiteId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO')")
    public ResponseEntity<DocumentoBorrador> saveDraft(
            @PathVariable String tramiteId,
            @RequestBody GuardarBorradorDTO body) {

        String userId = TenantContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        // 1. Validar tenant
        if (!Objects.equals(tramite.getTenantId(), usuario.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // 2. Si el trámite ya está completado o cancelado, no permitir edición
        if (tramite.getEstado() == EstadoTramite.COMPLETADO ||
            tramite.getEstado() == EstadoTramite.CANCELADO) {
            throw new BusinessRuleException("No se puede editar el borrador de un trámite finalizado o cancelado.");
        }

        // 3. Validar acceso dinámico por "Calles" (RBAC dinámico por etapa del proceso BPM)
        validarAccesoCalleActiva(tramite, usuario);

        DocumentoBorrador borrador = repository.findByTramiteId(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoBorrador", "tramiteId", tramiteId));

        if (borrador.isArchivado()) {
            throw new BusinessRuleException("El borrador ya ha sido archivado y no se puede modificar.");
        }

        borrador.setContenidoHtml(body.getContenidoHtml());
        
        if (body.getNombre() != null) {
            borrador.setNombre(body.getNombre().trim());
        }
        
        if (body.getEstadoBinarioYjsBase64() != null && !body.getEstadoBinarioYjsBase64().trim().isEmpty()) {
            byte[] decoded = Base64.getDecoder().decode(body.getEstadoBinarioYjsBase64());
            borrador.setEstadoBinarioYjs(decoded);
        }

        borrador.setActualizadoEn(Instant.now());
        borrador.setModificadoPor(usuario.getNombre() + " " + usuario.getApellido());

        DocumentoBorrador saved = repository.save(borrador);
        log.info("Guardado borrador colaborativo para trámite ID: {} por {}", tramiteId, usuario.getEmail());

        auditService.registrar(
                tramite.getTenantId(),
                usuario.getId(),
                usuario.getNombre() + " " + usuario.getApellido(),
                "EDICION_BORRADOR",
                "DocumentoBorrador",
                tramiteId,
                "Guardado de cambios en el borrador colaborativo por " + usuario.getNombre() + " " + usuario.getApellido()
        );

        return ResponseEntity.ok(saved);
    }

    private void validarAccesoCalleActiva(Tramite tramite, Usuario usuario) {
        if (usuario.getRol() == RolUsuario.ADMINISTRADOR) {
            return;
        }

        List<RegistroActividad> registrosActivos = registroRepo.findByTramiteId(tramite.getId()).stream()
                .filter(r -> r.getEstado() == EstadoRegistro.PENDIENTE || r.getEstado() == EstadoRegistro.EN_PROGRESO)
                .toList();

        if (registrosActivos.isEmpty()) {
            throw new BusinessRuleException("No hay actividades activas actualmente en este trámite para permitir edición.");
        }

        PoliticaNegocio politica = politicaService.buscarPorId(tramite.getPoliticaId());

        boolean tienePermiso = false;
        for (RegistroActividad registro : registrosActivos) {
            String actId = registro.getActividadId();

            Calle calleActiva = politica.getCalles().stream()
                    .filter(c -> c.getActividades() != null && c.getActividades().stream().anyMatch(a -> Objects.equals(a.getId(), actId)))
                    .findFirst()
                    .orElse(null);

            if (calleActiva != null) {
                if (calleActiva.getDepartamentoId() == null || calleActiva.getDepartamentoId().trim().isEmpty()) {
                    tienePermiso = true;
                    break;
                }
                
                if (Objects.equals(calleActiva.getDepartamentoId(), usuario.getDepartamentoId())) {
                    tienePermiso = true;
                    break;
                }
            }
        }

        if (!tienePermiso) {
            throw new BusinessRuleException("No autorizado: Tu departamento/rol no pertenece a la calle activa de este trámite para editar el borrador.");
        }
    }

    @GetMapping("/tramite/{tramiteId}/auditoria")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO', 'CLIENTE')")
    public ResponseEntity<List<AuditLog>> getAuditLogs(@PathVariable String tramiteId) {
        String userId = TenantContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        Tramite tramite = tramiteRepository.findById(tramiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));

        // Validar tenant
        if (!Objects.equals(tramite.getTenantId(), usuario.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Si el usuario es CLIENTE, solo puede ver la auditoría de su propio trámite
        if (usuario.getRol() == RolUsuario.CLIENTE) {
            if (!Objects.equals(tramite.getClienteId(), usuario.getClienteId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        List<AuditLog> logs = auditLogRepository.findByEntidadAndEntidadIdOrderByTimestampDesc("DocumentoBorrador", tramiteId);
        return ResponseEntity.ok(logs);
    }
}

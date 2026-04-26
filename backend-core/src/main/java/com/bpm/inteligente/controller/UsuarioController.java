package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.dto.CrearUsuarioRequest;
import com.bpm.inteligente.dto.EditarUsuarioRequest;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.UsuarioRepository;
import com.bpm.inteligente.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioRepository usuarioRepo;
    private final AuditService auditService;

    @GetMapping("/tenant/{tenantId}")
    public List<Usuario> listarPorTenant(@PathVariable String tenantId) {
        return usuarioRepo.findByTenantId(tenantId);
    }

    @GetMapping("/tenant/{tenantId}/rol/{rol}")
    public List<Usuario> listarPorTenantYRol(@PathVariable String tenantId, @PathVariable String rol) {
        return usuarioRepo.findByTenantId(tenantId).stream()
                .filter(u -> u.getRol().name().equalsIgnoreCase(rol))
                .toList();
    }

    @GetMapping("/{id}")
    public Usuario buscarPorId(@PathVariable String id) {
        return usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + id));
    }

    @PostMapping("/tenant/{tenantId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Usuario crearUsuario(@PathVariable String tenantId,
                                @Valid @RequestBody CrearUsuarioRequest req,
                                @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        if (usuarioRepo.existsByEmail(req.getEmail())) {
            throw new BusinessRuleException("El email '" + req.getEmail() + "' ya está registrado.");
        }

        Usuario nuevo = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .nombre(req.getNombre())
                .apellido(req.getApellido())
                .email(req.getEmail())
                .password(req.getPassword())
                .telefono(req.getTelefono())
                .cargo(req.getCargo())
                .departamento(req.getDepartamento())
                .departamentoId(req.getDepartamentoId())
                .rol(req.getRol())
                .build());

        auditService.registrar(tenantId, adminId, "Admin",
                "CREAR_USUARIO", "Usuario", nuevo.getId(),
                "Creó usuario " + nuevo.getNombre() + " con rol " + nuevo.getRol());

        return nuevo;
    }

    @PutMapping("/{id}")
    public Usuario editarUsuario(@PathVariable String id,
                                 @Valid @RequestBody EditarUsuarioRequest req,
                                 @RequestHeader(value = "X-User-Id", required = false) String adminId,
                                 @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        Usuario user = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + id));

        if (tenantId != null && !user.getTenantId().equals(tenantId)) {
            throw new BusinessRuleException("No tiene permiso para editar usuarios de otro tenant.");
        }

        if (req.getNombre() != null) user.setNombre(req.getNombre());
        if (req.getApellido() != null) user.setApellido(req.getApellido());
        if (req.getEmail() != null && !req.getEmail().equals(user.getEmail())) {
            if (usuarioRepo.existsByEmail(req.getEmail())) {
                throw new BusinessRuleException("El email '" + req.getEmail() + "' ya está en uso.");
            }
            user.setEmail(req.getEmail());
        }
        if (req.getTelefono() != null) user.setTelefono(req.getTelefono());
        if (req.getCargo() != null) user.setCargo(req.getCargo());
        if (req.getDepartamento() != null) user.setDepartamento(req.getDepartamento());
        if (req.getDepartamentoId() != null) user.setDepartamentoId(req.getDepartamentoId());
        if (req.getRol() != null) user.setRol(req.getRol());
        if (req.getActivo() != null) user.setActivo(req.getActivo());
        user.setActualizadoEn(Instant.now());

        Usuario guardado = usuarioRepo.save(user);

        auditService.registrar(user.getTenantId(), adminId, "Admin",
                "EDITAR_USUARIO", "Usuario", id,
                "Editó usuario " + guardado.getNombre());

        return guardado;
    }

    @PatchMapping("/{id}/toggle-activo")
    public Usuario toggleActivo(@PathVariable String id,
                                @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        Usuario user = usuarioRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + id));
        user.setActivo(!user.isActivo());
        user.setActualizadoEn(Instant.now());
        Usuario guardado = usuarioRepo.save(user);

        auditService.registrar(user.getTenantId(), adminId, "Admin",
                user.isActivo() ? "ACTIVAR_USUARIO" : "SUSPENDER_USUARIO",
                "Usuario", id, (user.isActivo() ? "Activó" : "Suspendió") + " a " + user.getNombre());

        return guardado;
    }
}

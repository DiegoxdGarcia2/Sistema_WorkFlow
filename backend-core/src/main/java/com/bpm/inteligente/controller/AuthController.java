package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Tenant;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.dto.*;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.repository.TenantRepository;
import com.bpm.inteligente.repository.UsuarioRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarioRepo;
    private final TenantRepository tenantRepo;

    @PostMapping("/login")
    public UsuarioDTO login(@Valid @RequestBody LoginRequest request) {
        Usuario user = usuarioRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessRuleException("Credenciales inválidas."));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new BusinessRuleException("Credenciales inválidas.");
        }

        String tenantNombre = tenantRepo.findById(user.getTenantId())
                .map(Tenant::getNombre).orElse("Desconocido");

        return UsuarioDTO.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .tenantNombre(tenantNombre)
                .nombre(user.getNombre())
                .email(user.getEmail())
                .rol(user.getRol())
                .build();
    }

    @PostMapping("/registro-empresa")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDTO registroEmpresa(@Valid @RequestBody RegistroEmpresaRequest request) {
        if (usuarioRepo.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("El email '" + request.getEmail() + "' ya está registrado.");
        }

        Tenant tenant = tenantRepo.save(Tenant.builder()
                .id(UUID.randomUUID().toString())
                .nombre(request.getNombreEmpresa())
                .build());

        Usuario admin = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenant.getId())
                .nombre(request.getNombreAdmin())
                .email(request.getEmail())
                .password(request.getPassword())
                .rol(RolUsuario.ADMINISTRADOR)
                .build());

        return UsuarioDTO.builder()
                .id(admin.getId())
                .tenantId(tenant.getId())
                .tenantNombre(tenant.getNombre())
                .nombre(admin.getNombre())
                .email(admin.getEmail())
                .rol(admin.getRol())
                .build();
    }
}

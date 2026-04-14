package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.dto.CrearUsuarioRequest;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.repository.UsuarioRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioRepository usuarioRepo;

    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepo.findAll();
    }

    @GetMapping("/tenant/{tenantId}")
    public List<Usuario> listarPorTenant(@PathVariable String tenantId) {
        return usuarioRepo.findAll().stream()
                .filter(u -> u.getTenantId().equals(tenantId))
                .toList();
    }

    @PostMapping("/tenant/{tenantId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Usuario crearUsuario(@PathVariable String tenantId, @Valid @RequestBody CrearUsuarioRequest request) {
        if (usuarioRepo.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("El email '" + request.getEmail() + "' ya está registrado.");
        }

        return usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .nombre(request.getNombre())
                .email(request.getEmail())
                .password(request.getPassword())
                .rol(request.getRol())
                .build());
    }
}

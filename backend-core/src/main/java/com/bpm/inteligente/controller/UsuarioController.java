package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}

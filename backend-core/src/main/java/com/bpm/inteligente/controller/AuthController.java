package com.bpm.inteligente.controller;

import com.bpm.inteligente.config.JwtService;
import com.bpm.inteligente.domain.Tenant;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.dto.*;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.repository.ClienteRepository;
import com.bpm.inteligente.repository.TenantRepository;
import com.bpm.inteligente.repository.UsuarioRepository;
import com.bpm.inteligente.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controlador de autenticación con JWT.
 * Endpoints públicos (no requieren token):
 *   - POST /api/auth/login
 *   - POST /api/auth/registro-empresa
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepo;
    private final ClienteRepository clienteRepo;
    private final TenantRepository tenantRepo;
    private final AuditService auditService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    /**
     * Registro de cliente. Vincula un Cliente existente con un nuevo Usuario.
     */
    @PostMapping("/registro-cliente")
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioDTO registroCliente(@Valid @RequestBody RegistroClienteRequest request) {
        if (usuarioRepo.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException("El email '" + request.getEmail() + "' ya está registrado.");
        }

        // Buscar el cliente por CI y Email para verificar identidad
        var cliente = clienteRepo.findByCorreo(request.getEmail())
                .filter(c -> c.getCi().equals(request.getCi()))
                .orElseThrow(() -> new BusinessRuleException("No se encontró un cliente registrado con esos datos. Contacte a la institución para que registren sus datos primero."));

        Usuario user = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cliente.getTenantId())
                .nombre(cliente.getNombre())
                .apellido(cliente.getApellido())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(RolUsuario.CLIENTE)
                .clienteId(cliente.getId())
                .activo(true)
                .build());

        String token = jwtService.generateToken(user.getEmail(), Map.of(
                "id", user.getId(),
                "tenantId", user.getTenantId(),
                "rol", user.getRol().name(),
                "clienteId", cliente.getId()
        ));

        auditService.registrar(cliente.getTenantId(), user.getId(), user.getNombre(),
                "REGISTRO_CLIENTE", "Usuario", user.getId(),
                "Cliente registrado exitosamente");

        return UsuarioDTO.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .nombre(user.getNombre())
                .apellido(user.getApellido())
                .email(user.getEmail())
                .rol(user.getRol())
                .activo(true)
                .token(token)
                .clienteId(cliente.getId())
                .build();
    }

    /**
     * Login con email + password. Retorna UsuarioDTO con JWT token.
     */
    @PostMapping("/login")
    public UsuarioDTO login(@Valid @RequestBody LoginRequest request) {
        // Spring Security valida credenciales (BCrypt)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        Usuario user = usuarioRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessRuleException("Credenciales inválidas."));

        if (!user.isActivo()) {
            throw new BusinessRuleException("Su cuenta ha sido suspendida. Contacte al administrador.");
        }

        String tenantNombre = tenantRepo.findById(user.getTenantId())
                .map(Tenant::getNombre).orElse("Desconocido");

        // Generar JWT con claims de multi-tenancy
        java.util.Map<String, Object> claims = new java.util.HashMap<>();
        claims.put("id", user.getId());
        claims.put("tenantId", user.getTenantId());
        claims.put("rol", user.getRol().name());
        if (user.getClienteId() != null) {
            claims.put("clienteId", user.getClienteId());
        }

        String token = jwtService.generateToken(user.getEmail(), claims);

        auditService.registrar(user.getTenantId(), user.getId(), user.getNombre(),
                "LOGIN", "Usuario", user.getId(), "Inicio de sesión exitoso");

        return UsuarioDTO.builder()
                .id(user.getId())
                .tenantId(user.getTenantId())
                .tenantNombre(tenantNombre)
                .nombre(user.getNombre())
                .apellido(user.getApellido())
                .email(user.getEmail())
                .telefono(user.getTelefono())
                .cargo(user.getCargo())
                .departamento(user.getDepartamento())
                .departamentoId(user.getDepartamentoId())
                .rol(user.getRol())
                .activo(user.isActivo())
                .creadoEn(user.getCreadoEn() != null ? user.getCreadoEn().toString() : null)
                .token(token)
                .clienteId(user.getClienteId())
                .build();
    }

    /**
     * Registro de empresa. Crea Tenant + Usuario Admin con JWT token.
     */
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
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(RolUsuario.ADMINISTRADOR)
                .build());

        String token = jwtService.generateToken(admin.getEmail(), Map.of(
                "id", admin.getId(),
                "tenantId", admin.getTenantId(),
                "rol", admin.getRol().name()
        ));

        auditService.registrar(tenant.getId(), admin.getId(), admin.getNombre(),
                "REGISTRO_EMPRESA", "Tenant", tenant.getId(),
                "Registró empresa '" + tenant.getNombre() + "'");

        return UsuarioDTO.builder()
                .id(admin.getId())
                .tenantId(tenant.getId())
                .tenantNombre(tenant.getNombre())
                .nombre(admin.getNombre())
                .email(admin.getEmail())
                .rol(admin.getRol())
                .activo(true)
                .token(token)
                .build();
    }
}

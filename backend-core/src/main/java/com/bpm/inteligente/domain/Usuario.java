package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.RolUsuario;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/**
 * Entidad de usuario con integración Spring Security (UserDetails).
 * El password se almacena como BCrypt hash.
 * El tenantId se extrae y coloca en el JWT para multi-tenancy.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usuarios")
@CompoundIndex(name = "idx_tenant_rol", def = "{'tenantId': 1, 'rol': 1}")
public class Usuario implements UserDetails {

    @Id
    private String id;

    @Version
    private Long version;

    @Indexed
    private String tenantId;
    private String nombre;
    private String apellido;
    private String telefono;
    private String cargo;
    private String departamento;
    private String departamentoId;

    @Indexed(unique = true)
    private String email;

    private String password;
    private RolUsuario rol;
    private String clienteId;

    @Builder.Default
    private boolean activo = true;

    @Builder.Default
    private Instant creadoEn = Instant.now();

    private Instant actualizadoEn;

    // ── Spring Security UserDetails ──────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return activo;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }
}

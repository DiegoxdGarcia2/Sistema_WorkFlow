package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usuarios")
@CompoundIndex(name = "idx_tenant_rol", def = "{'tenantId': 1, 'rol': 1}")
public class Usuario {

    @Id
    private String id;

    private String tenantId;
    private String nombre;
    private String apellido;
    private String telefono;
    private String cargo;

    @Indexed(unique = true)
    private String email;

    private String password;
    private RolUsuario rol;

    @Builder.Default
    private boolean activo = true;

    @Builder.Default
    private Instant creadoEn = Instant.now();

    private Instant actualizadoEn;
}

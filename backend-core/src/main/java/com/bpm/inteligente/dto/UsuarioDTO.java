package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioDTO {

    private String id;
    private String tenantId;
    private String tenantNombre;
    private String nombre;
    private String email;
    private RolUsuario rol;
}

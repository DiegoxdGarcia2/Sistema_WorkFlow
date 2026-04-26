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
    private String apellido;
    private String email;
    private String telefono;
    private String cargo;
    private String departamento;
    private String departamentoId;
    private RolUsuario rol;
    private boolean activo;
    private String creadoEn;
}

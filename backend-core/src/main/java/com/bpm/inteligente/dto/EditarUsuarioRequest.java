package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.enums.RolUsuario;
import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EditarUsuarioRequest {

    private String nombre;
    private String apellido;

    @Email(message = "Email inválido")
    private String email;

    private String telefono;
    private String cargo;
    private RolUsuario rol;
    private Boolean activo;
}

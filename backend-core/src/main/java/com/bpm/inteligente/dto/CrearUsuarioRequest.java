package com.bpm.inteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.bpm.inteligente.domain.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CrearUsuarioRequest {

    @NotBlank
    private String nombre;

    @NotBlank @Email
    private String email;

    @NotBlank
    private String password;

    @NotNull
    private RolUsuario rol;
}

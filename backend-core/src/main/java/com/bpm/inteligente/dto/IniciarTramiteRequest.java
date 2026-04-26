package com.bpm.inteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IniciarTramiteRequest {

    @NotBlank(message = "El politicaId es obligatorio")
    private String politicaId;

    private String usuarioId;
}

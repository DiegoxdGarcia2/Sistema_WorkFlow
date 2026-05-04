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

    /** Datos opcionales del cliente asociado al trámite */
    private String clienteId;
    private String documentoCliente;
    private String clienteNombre;
}

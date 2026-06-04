package com.bpm.inteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyncRequestDTO implements Serializable {

    @NotBlank(message = "El politicaId es obligatorio")
    private String politicaId;

    @NotBlank(message = "El usuarioId es obligatorio")
    private String usuarioId;

    private String clienteId;
    private String documentoCliente;
    private String clienteNombre;
    private String offlineId;
}

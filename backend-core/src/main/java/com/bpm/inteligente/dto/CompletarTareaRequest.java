package com.bpm.inteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CompletarTareaRequest {

    @NotBlank(message = "El registroId es obligatorio")
    private String registroId;

    private Map<String, Object> esquemaFormulario;
    private Map<String, Object> datosFormulario;
    private java.util.List<com.bpm.inteligente.domain.RegistroActividad.ArchivoInfo> archivos;
    private String notas;
}

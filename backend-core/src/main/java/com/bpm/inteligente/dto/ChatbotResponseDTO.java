package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotResponseDTO {
    @JsonProperty("respuesta")
    private String respuesta;
    
    @JsonProperty("rutaNavegacion")
    private String rutaNavegacion;
}

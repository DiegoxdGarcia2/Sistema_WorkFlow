package com.bpm.inteligente.dto;

import lombok.Data;
import java.util.Map;

@Data
public class AiCommandDTO {
    private String politicaId;
    private String instruccion;
    private PoliticaDTO contexto; // El estado actual del diagrama
}

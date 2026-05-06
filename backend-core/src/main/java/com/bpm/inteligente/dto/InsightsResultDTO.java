package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsightsResultDTO {
    private String politicaId;
    private String generadoEn;
    private Map<String, Object> metricas;
    private List<Map<String, Object>> cuellosBottella;
    private Map<String, Object> prediccion;
    private String insightsNaturales;
    private List<Map<String, Object>> alertas;
}

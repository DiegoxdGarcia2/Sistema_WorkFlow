package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO público para el Portal del Cliente (tracking de trámites).
 * Contiene el trámite + sus registros de actividad ordenados cronológicamente
 * + el nombre de la calle (departamento) donde ocurrió cada paso.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrackingDTO {

    private TramiteDTO tramite;
    private List<PasoTimeline> timeline;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasoTimeline {
        private String registroId;
        private String actividadNombre;
        private String calleNombre;
        private String estado;
        private String ejecutadoPor;
        private String notas;
        private String asignadoEn;
        private String completadoEn;
    }
}

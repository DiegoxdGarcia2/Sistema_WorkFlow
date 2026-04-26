package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonitorTramiteDTO {
    private String tramiteId;
    private String politicaId;
    private String politicaNombre;
    private Instant iniciadoEn;
    private Instant finalizadoEn;
    private String estadoGeneral;
    
    // Nodos actuales en ejecución (pueden ser varios en caso de paralelismo)
    private List<PasoActual> pasosActuales;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasoActual {
        private String registroId;
        private String actividadId;
        private String actividadNombre;
        private String departamentoNombre;
        private String asignadoA;
        private Instant asignadoEn;
        private String estado;
    }
}

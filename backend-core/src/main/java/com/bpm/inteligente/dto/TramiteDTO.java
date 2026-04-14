package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TramiteDTO {

    private String id;
    private String politicaId;
    private String politicaNombre;
    private String tenantId;
    private EstadoTramite estado;
    private Instant iniciadoEn;
    private Instant finalizadoEn;
}

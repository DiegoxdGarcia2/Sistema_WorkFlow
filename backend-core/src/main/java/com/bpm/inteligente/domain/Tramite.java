package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "tramites")
@CompoundIndex(name = "idx_tenant_estado", def = "{'tenantId': 1, 'estado': 1}")
public class Tramite {

    @Id
    private String id;

    @Indexed
    private String politicaId;

    private String tenantId;

    @Builder.Default
    private EstadoTramite estado = EstadoTramite.INICIADO;

    @Builder.Default
    private Instant iniciadoEn = Instant.now();

    private Instant finalizadoEn;
}

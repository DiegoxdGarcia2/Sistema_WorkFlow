package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.EstadoTramite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.*;
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

    @Version
    private Long version;

    @Indexed
    private String politicaId;

    @Indexed
    private String tenantId;

    @Indexed(unique = true, sparse = true)
    private String codigoSeguimiento;

    @Indexed
    private String clienteId;

    private String documentoCliente;

    private String clienteNombre;

    @Builder.Default
    private EstadoTramite estado = EstadoTramite.INICIADO;

    private Instant finalizadoEn;

    // ── Auditoría Enterprise ──────────────────────────────────

    /** ID del usuario que creó este trámite */
    @CreatedBy
    private String creadoPor;

    /** Fecha de creación automática */
    @CreatedDate
    private Instant iniciadoEn;

    /** ID del último usuario que modificó este trámite */
    @LastModifiedBy
    private String modificadoPor;

    /** Fecha de última modificación */
    @LastModifiedDate
    private Instant actualizadoEn;
}

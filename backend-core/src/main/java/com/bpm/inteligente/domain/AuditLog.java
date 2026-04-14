package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_log")
public class AuditLog {

    @Id
    private String id;
    private String tenantId;
    private String usuarioId;
    private String usuarioNombre;
    private String accion;
    private String entidad;
    private String entidadId;
    private String detalle;

    @Builder.Default
    private Instant timestamp = Instant.now();
}

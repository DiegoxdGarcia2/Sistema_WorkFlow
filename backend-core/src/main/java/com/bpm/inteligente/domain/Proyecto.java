package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "proyectos")
@CompoundIndex(name = "idx_tenant_proyecto", def = "{'tenantId': 1, 'nombre': 1}", unique = true)
public class Proyecto {

    @Id
    private String id;

    private String tenantId;
    private String nombre;

    @Builder.Default
    private String descripcion = "";

    @Builder.Default
    private String color = "#6366f1"; // Indigo por defecto

    private String responsable;       // Nombre del responsable del proyecto
    private String responsableId;     // ID del responsable del proyecto

    @Builder.Default
    private String estado = "ACTIVO"; // ACTIVO, ARCHIVADO

    @Builder.Default
    private Instant creadoEn = Instant.now();

    @Builder.Default
    private Instant actualizadoEn = Instant.now();
}

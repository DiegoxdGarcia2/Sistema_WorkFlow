package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "politicas_negocio")
@CompoundIndex(name = "idx_tenant_nombre_version", def = "{'tenantId': 1, 'nombre': 1, 'version': 1}", unique = true)
public class PoliticaNegocio {

    @Id
    private String id;

    private String tenantId;
    private String nombre;

    @Builder.Default
    private String descripcion = "";

    @Builder.Default
    private int version = 1;

    @Builder.Default
    private boolean estaActiva = false;

    /** Calles con Actividades embebidas (Aggregate Root) */
    @Builder.Default
    private List<Calle> calles = new ArrayList<>();

    /** Transiciones embebidas (aristas del grafo dirigido) */
    @Builder.Default
    private List<Transicion> transiciones = new ArrayList<>();

    @Builder.Default
    private Instant creadoEn = Instant.now();

    @Builder.Default
    private Instant actualizadoEn = Instant.now();
}

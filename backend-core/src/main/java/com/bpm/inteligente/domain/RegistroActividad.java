package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.EstadoRegistro;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "registros_actividad")
@CompoundIndex(name = "idx_tramite_estado", def = "{'tramiteId': 1, 'estado': 1}")
@CompoundIndex(name = "idx_ejecutor_estado", def = "{'ejecutadoPor': 1, 'estado': 1}")
public class RegistroActividad {

    @Id
    private String id;

    @Indexed
    private String tramiteId;

    private String actividadId;
    private String ejecutadoPor;
    private String ejecutadoPorId;
    @Indexed
    private String departamentoId;

    @Indexed
    private String tenantId;

    @Builder.Default
    private EstadoRegistro estado = EstadoRegistro.PENDIENTE;

    /** Schema-on-read: estructura dinámica del formulario */
    @Builder.Default
    private Map<String, Object> esquemaFormulario = new HashMap<>();

    /** Datos capturados por el funcionario contra el esquema */
    @Builder.Default
    private Map<String, Object> datosFormulario = new HashMap<>();

    @Builder.Default
    private List<ArchivoInfo> archivos = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchivoInfo {
        private String id;
        private String nombre;
        private String path;
        private String tipo;
        private long tamano;
        private Instant subidoEn;
    }

    @Builder.Default
    private String notas = "";

    @Builder.Default
    private Instant asignadoEn = Instant.now();

    private Instant completadoEn;
}

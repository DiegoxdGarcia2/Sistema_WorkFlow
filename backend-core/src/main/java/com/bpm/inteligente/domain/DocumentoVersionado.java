package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.AccionDocumento;
import com.bpm.inteligente.domain.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "documentos_versionado")
public class DocumentoVersionado {

    @Id
    private String id;

    @Indexed
    private String tramiteId;

    @Indexed
    private String tenantId;

    private String nombreOriginal;

    private int versionActual;

    @Builder.Default
    private List<Revision> historial = new ArrayList<>();

    @Builder.Default
    private String estado = "ACTIVO"; // ACTIVO, ELIMINADO

    private Instant creadoEn;
    private Instant actualizadoEn;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Revision {
        private int version;
        private String s3Key;
        private String s3Url;
        private AccionDocumento accion;
        private String usuarioId;
        private String usuarioNombre;
        private RolUsuario rolUsuario;
        private Instant timestamp;
        private String sha256Hash;
    }
}

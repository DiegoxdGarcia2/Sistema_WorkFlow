package com.bpm.inteligente.domain;

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
@Document(collection = "tramites_borradores")
@CompoundIndex(name = "idx_tramite_tenant", def = "{'tramiteId': 1, 'tenantId': 1}", unique = true)
public class DocumentoBorrador {
    @Id
    private String id;

    @Indexed
    private String tramiteId;

    @Indexed
    private String tenantId;

    private String contenidoHtml;

    // Estado binario Yjs serializado para reconstrucción rápida del Y.Doc
    private byte[] estadoBinarioYjs;

    private Instant actualizadoEn;
    private String modificadoPor;
    
    @Builder.Default
    private boolean archivado = false;

    private String nombre;

    public String getNombre() {
        if (nombre == null || nombre.trim().isEmpty()) {
            return "Borrador de Trámite";
        }
        return nombre;
    }
}

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
@Document(collection = "documentos_colaborativos")
public class DocumentoColaborativo {

    @Id
    private String id;

    @Indexed
    private String politicaNombre;

    @Indexed
    private String clienteNombre;

    @Indexed
    private String departamentoId;

    private String titulo;

    private String contenido;

    private String ultimoEditor;

    private Instant actualizadoEn;
}

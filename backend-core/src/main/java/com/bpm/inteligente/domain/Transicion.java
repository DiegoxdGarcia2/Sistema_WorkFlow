package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.TipoRuta;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transicion {

    private String id;
    private String origenId;
    private String destinoId;
    private TipoRuta tipoRuta;

    @Builder.Default
    private String condicion = "";

    @Builder.Default
    private String etiqueta = "";

    @Builder.Default
    private int prioridad = 0;
}

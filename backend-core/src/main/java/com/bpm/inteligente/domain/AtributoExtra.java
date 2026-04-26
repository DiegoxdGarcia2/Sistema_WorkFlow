package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtributoExtra {
    private String nombre;
    private String tipo; // "texto", "numero", "fecha", "booleano"
    private String valor;
}

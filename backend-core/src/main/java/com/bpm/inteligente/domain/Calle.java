package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Calle {

    private String id;
    private String nombre;
    private int orden;
    @Builder.Default
    private int ancho = 270;
    private String departamentoId;

    @Builder.Default
    private String color = "#475569"; // Slate por defecto

    @Builder.Default
    private List<Actividad> actividades = new ArrayList<>();
}

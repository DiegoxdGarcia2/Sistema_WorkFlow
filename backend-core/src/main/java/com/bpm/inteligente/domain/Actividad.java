package com.bpm.inteligente.domain;

import com.bpm.inteligente.domain.enums.TipoActividad;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Actividad {

    private String id;
    private String nombre;
    private TipoActividad tipo;
    private boolean esInicial;
    private boolean esFinal;
    private int orden;

    /** Estilo visual del nodo */
    private String color;           // Color hex del nodo (ej: "#6366f1")
    private String descripcion;     // Descripción larga
    @Builder.Default
    private int ancho = 220;        // Ancho en px
    @Builder.Default
    private int alto = 80;          // Alto en px
    @Builder.Default
    private String fontSize = "md"; // "sm", "md", "lg"

    /** Posición en el canvas */
    private Double posX;
    private Double posY;

    /** JSON Schema del formulario dinámico para esta actividad */
    private Map<String, Object> esquemaFormulario;

    private String plantillaId;
}

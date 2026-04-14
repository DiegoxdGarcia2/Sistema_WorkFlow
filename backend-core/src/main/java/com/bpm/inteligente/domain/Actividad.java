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

    /** JSON Schema del formulario dinámico para esta actividad */
    private Map<String, Object> esquemaFormulario;
}

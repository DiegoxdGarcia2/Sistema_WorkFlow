package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.Calle;
import com.bpm.inteligente.domain.Transicion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoliticaDTO {

    private String id;

    @NotBlank(message = "El tenantId es obligatorio")
    private String tenantId;

    @NotBlank(message = "El nombre es obligatorio")
    private String nombre;

    private String descripcion;
    private int version;
    private boolean estaActiva;

    @Builder.Default
    private List<Calle> calles = new ArrayList<>();

    @Builder.Default
    private List<Transicion> transiciones = new ArrayList<>();

    private Instant creadoEn;
    private Instant actualizadoEn;
}

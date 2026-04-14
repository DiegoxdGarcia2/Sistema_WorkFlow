package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.enums.EstadoRegistro;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegistroActividadDTO {

    private String id;
    private String tramiteId;
    private String actividadId;
    private String actividadNombre;
    private String ejecutadoPor;
    private EstadoRegistro estado;
    private Map<String, Object> esquemaFormulario;
    private Map<String, Object> datosFormulario;
    private String notas;
    private Instant asignadoEn;
    private Instant completadoEn;
}

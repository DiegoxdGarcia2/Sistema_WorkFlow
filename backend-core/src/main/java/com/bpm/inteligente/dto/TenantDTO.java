package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDTO {
    private String id;
    private String nombre;
    private String nit;
    private String direccion;
    private String industria;
    private String sitioWeb;
    private String telefonoInstitucional;
    private String emailContacto;
    private String logoUrl;
    private String lema;
    private Instant creadoEn;
}

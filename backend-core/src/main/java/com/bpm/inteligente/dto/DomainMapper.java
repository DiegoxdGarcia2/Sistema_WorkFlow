package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.Tramite;

/**
 * Mapper estático entre entidades de dominio y DTOs.
 * No se expone el dominio directamente al frontend.
 */
public final class DomainMapper {

    private DomainMapper() {}

    public static PoliticaNegocio toDomain(PoliticaDTO dto) {
        return PoliticaNegocio.builder()
                .id(dto.getId())
                .tenantId(dto.getTenantId())
                .proyectoId(dto.getProyectoId())
                .nombre(dto.getNombre())
                .descripcion(dto.getDescripcion())
                .version(dto.getVersion())
                .estaActiva(dto.isEstaActiva())
                .calles(dto.getCalles())
                .transiciones(dto.getTransiciones())
                .build();
    }

    public static PoliticaDTO toDTO(PoliticaNegocio entity) {
        return PoliticaDTO.builder()
                .id(entity.getId())
                .tenantId(entity.getTenantId())
                .proyectoId(entity.getProyectoId())
                .nombre(entity.getNombre())
                .descripcion(entity.getDescripcion())
                .version(entity.getVersion())
                .estaActiva(entity.isEstaActiva())
                .calles(entity.getCalles())
                .transiciones(entity.getTransiciones())
                .creadoEn(entity.getCreadoEn())
                .actualizadoEn(entity.getActualizadoEn())
                .build();
    }

    public static TramiteDTO toDTO(Tramite entity, String politicaNombre) {
        return TramiteDTO.builder()
                .id(entity.getId())
                .politicaId(entity.getPoliticaId())
                .politicaNombre(politicaNombre)
                .tenantId(entity.getTenantId())
                .estado(entity.getEstado())
                .iniciadoEn(entity.getIniciadoEn())
                .finalizadoEn(entity.getFinalizadoEn())
                .build();
    }

    public static RegistroActividadDTO toDTO(RegistroActividad entity, String actividadNombre) {
        return RegistroActividadDTO.builder()
                .id(entity.getId())
                .tramiteId(entity.getTramiteId())
                .actividadId(entity.getActividadId())
                .actividadNombre(actividadNombre)
                .ejecutadoPor(entity.getEjecutadoPor())
                .estado(entity.getEstado())
                .esquemaFormulario(entity.getEsquemaFormulario())
                .datosFormulario(entity.getDatosFormulario())
                .notas(entity.getNotas())
                .asignadoEn(entity.getAsignadoEn())
                .completadoEn(entity.getCompletadoEn())
                .build();
    }
}

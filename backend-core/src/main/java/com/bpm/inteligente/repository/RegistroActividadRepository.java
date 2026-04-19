package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RegistroActividadRepository extends MongoRepository<RegistroActividad, String> {

    List<RegistroActividad> findByTramiteId(String tramiteId);

    List<RegistroActividad> findByTramiteIdAndEstado(String tramiteId, EstadoRegistro estado);

    List<RegistroActividad> findByEjecutadoPorAndEstado(String ejecutadoPor, EstadoRegistro estado);

    /** Tareas asignadas a un usuario en múltiples estados */
    List<RegistroActividad> findByEjecutadoPorAndEstadoIn(String ejecutadoPor, List<EstadoRegistro> estados);

    /** Tareas sin asignar (ejecutadoPor == null) en un estado específico */
    List<RegistroActividad> findByEjecutadoPorIsNullAndEstado(EstadoRegistro estado);
}

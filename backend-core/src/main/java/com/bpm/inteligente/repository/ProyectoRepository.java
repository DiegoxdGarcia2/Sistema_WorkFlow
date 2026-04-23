package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Proyecto;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProyectoRepository extends MongoRepository<Proyecto, String> {

    List<Proyecto> findByTenantIdOrderByCreadoEnDesc(String tenantId);

    boolean existsByTenantIdAndNombre(String tenantId, String nombre);
}

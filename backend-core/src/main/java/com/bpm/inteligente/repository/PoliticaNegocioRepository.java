package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.PoliticaNegocio;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface PoliticaNegocioRepository extends MongoRepository<PoliticaNegocio, String> {

    List<PoliticaNegocio> findByTenantId(String tenantId);

    List<PoliticaNegocio> findByTenantIdAndEstaActiva(String tenantId, boolean estaActiva);

    boolean existsByTenantIdAndNombreAndVersion(String tenantId, String nombre, int version);
}

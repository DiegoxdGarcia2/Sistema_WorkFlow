package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.domain.enums.EstadoTramite;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TramiteRepository extends MongoRepository<Tramite, String> {

    List<Tramite> findByTenantIdAndEstado(String tenantId, EstadoTramite estado);

    List<Tramite> findByPoliticaId(String politicaId);

    long countByPoliticaId(String politicaId);
}

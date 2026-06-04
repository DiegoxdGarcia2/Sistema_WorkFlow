package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.DocumentoVersionado;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DocumentoVersionadoRepository extends MongoRepository<DocumentoVersionado, String> {

    List<DocumentoVersionado> findByTramiteIdAndEstado(String tramiteId, String estado);

    List<DocumentoVersionado> findByTramiteId(String tramiteId);

    List<DocumentoVersionado> findByTenantIdAndEstado(String tenantId, String estado);
}

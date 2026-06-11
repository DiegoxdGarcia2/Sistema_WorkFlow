package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.DocumentoBorrador;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentoBorradorRepository extends MongoRepository<DocumentoBorrador, String> {
    Optional<DocumentoBorrador> findByTramiteIdAndTenantId(String tramiteId, String tenantId);
    Optional<DocumentoBorrador> findByTramiteId(String tramiteId);
}

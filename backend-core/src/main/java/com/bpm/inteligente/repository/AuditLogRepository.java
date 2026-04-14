package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.AuditLog;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {
    List<AuditLog> findByTenantIdOrderByTimestampDesc(String tenantId);
    List<AuditLog> findByEntidadAndEntidadIdOrderByTimestampDesc(String entidad, String entidadId);
}

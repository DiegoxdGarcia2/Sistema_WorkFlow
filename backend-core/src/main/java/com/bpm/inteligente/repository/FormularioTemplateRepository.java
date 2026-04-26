package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.FormularioTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormularioTemplateRepository extends MongoRepository<FormularioTemplate, String> {
    List<FormularioTemplate> findByTenantId(String tenantId);
}

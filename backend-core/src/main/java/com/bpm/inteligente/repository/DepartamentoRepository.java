package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Departamento;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface DepartamentoRepository extends MongoRepository<Departamento, String> {
    List<Departamento> findByTenantId(String tenantId);
}

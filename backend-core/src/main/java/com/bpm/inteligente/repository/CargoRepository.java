package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Cargo;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CargoRepository extends MongoRepository<Cargo, String> {
    List<Cargo> findByTenantId(String tenantId);
}

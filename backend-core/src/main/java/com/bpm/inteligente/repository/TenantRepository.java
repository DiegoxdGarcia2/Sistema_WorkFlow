package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Tenant;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TenantRepository extends MongoRepository<Tenant, String> {

    Optional<Tenant> findByNombre(String nombre);

    boolean existsByNombre(String nombre);
}

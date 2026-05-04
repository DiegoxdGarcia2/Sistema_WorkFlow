package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Cliente;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends MongoRepository<Cliente, String> {

    List<Cliente> findByTenantId(String tenantId);

    Optional<Cliente> findByTenantIdAndCi(String tenantId, String ci);

    /**
     * Búsqueda flexible por nombre, apellido, CI o correo (case-insensitive).
     */
    @Query("{ 'tenantId': ?0, $or: [ " +
           "{ 'nombre': { $regex: ?1, $options: 'i' } }, " +
           "{ 'apellido': { $regex: ?1, $options: 'i' } }, " +
           "{ 'ci': { $regex: ?1, $options: 'i' } }, " +
           "{ 'correo': { $regex: ?1, $options: 'i' } } ] }")
    List<Cliente> buscarPorTermino(String tenantId, String termino);
}

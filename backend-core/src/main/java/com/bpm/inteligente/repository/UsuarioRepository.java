package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.domain.enums.RolUsuario;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByEmail(String email);

    List<Usuario> findByTenantIdAndRol(String tenantId, RolUsuario rol);

    boolean existsByEmail(String email);
}

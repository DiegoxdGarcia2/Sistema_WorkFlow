package com.bpm.inteligente.repository;

import com.bpm.inteligente.domain.DocumentoColaborativo;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DocumentoColaborativoRepository extends MongoRepository<DocumentoColaborativo, String> {

    Optional<DocumentoColaborativo> findByPoliticaNombreAndClienteNombreAndDepartamentoId(
            String politicaNombre, 
            String clienteNombre, 
            String departamentoId
    );
}

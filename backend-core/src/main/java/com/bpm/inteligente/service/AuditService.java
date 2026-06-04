package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.AuditLog;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.domain.enums.RolUsuario;
import com.bpm.inteligente.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;
    private final MongoTemplate mongoTemplate;

    public void registrar(String tenantId, String usuarioId, String usuarioNombre,
                          String accion, String entidad, String entidadId, String detalle) {
        repo.save(AuditLog.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(tenantId)
                .usuarioId(usuarioId)
                .usuarioNombre(usuarioNombre)
                .accion(accion)
                .entidad(entidad)
                .entidadId(entidadId)
                .detalle(detalle)
                .build());
    }

    public List<AuditLog> listarPorTenant(String tenantId) {
        return listarPorTenant(tenantId, null, null, null, null, null, null, null);
    }

    public List<AuditLog> listarPorTenant(String tenantId, String usuarioNombre, String accion, String fechaInicio, String fechaFin,
                                          String cargo, String departamentoId, String rol) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenantId").is(tenantId));

        // Filtro indirecto por atributos de Usuario (Cargo, Departamento, Rol)
        List<String> userIds = null;
        if ((cargo != null && !cargo.trim().isEmpty()) || 
            (departamentoId != null && !departamentoId.trim().isEmpty()) || 
            (rol != null && !rol.trim().isEmpty())) {
            
            Query userQuery = new Query();
            userQuery.addCriteria(Criteria.where("tenantId").is(tenantId));
            
            if (cargo != null && !cargo.trim().isEmpty()) {
                userQuery.addCriteria(Criteria.where("cargo").is(cargo));
            }
            if (departamentoId != null && !departamentoId.trim().isEmpty()) {
                userQuery.addCriteria(Criteria.where("departamentoId").is(departamentoId));
            }
            if (rol != null && !rol.trim().isEmpty()) {
                try {
                    RolUsuario rolEnum = RolUsuario.valueOf(rol.toUpperCase().trim());
                    userQuery.addCriteria(Criteria.where("rol").is(rolEnum));
                } catch (Exception e) {
                    log.warn("Rol inválido para filtrado: {}", rol);
                    return new ArrayList<>();
                }
            }
            
            List<Usuario> matchingUsers = mongoTemplate.find(userQuery, Usuario.class);
            userIds = matchingUsers.stream().map(Usuario::getId).toList();
            
            if (userIds.isEmpty()) {
                return new ArrayList<>();
            }
        }

        if (userIds != null) {
            query.addCriteria(Criteria.where("usuarioId").in(userIds));
        }

        if (usuarioNombre != null && !usuarioNombre.trim().isEmpty()) {
            Query userSearchQuery = new Query();
            userSearchQuery.addCriteria(Criteria.where("tenantId").is(tenantId));
            userSearchQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("email").regex(usuarioNombre.trim(), "i"),
                Criteria.where("nombre").regex(usuarioNombre.trim(), "i"),
                Criteria.where("apellido").regex(usuarioNombre.trim(), "i")
            ));
            List<Usuario> foundUsers = mongoTemplate.find(userSearchQuery, Usuario.class);
            List<String> resolvedUserIds = foundUsers.stream().map(Usuario::getId).toList();

            Criteria nameCriteria = Criteria.where("usuarioNombre").regex(usuarioNombre.trim(), "i");
            if (!resolvedUserIds.isEmpty()) {
                query.addCriteria(new Criteria().orOperator(
                    nameCriteria,
                    Criteria.where("usuarioId").in(resolvedUserIds)
                ));
            } else {
                query.addCriteria(nameCriteria);
            }
        }
        if (accion != null && !accion.trim().isEmpty()) {
            query.addCriteria(Criteria.where("accion").is(accion.toUpperCase().trim()));
        }

        if (fechaInicio != null && !fechaInicio.trim().isEmpty()) {
            try {
                Instant start = Instant.parse(fechaInicio);
                if (fechaFin != null && !fechaFin.trim().isEmpty()) {
                    Instant end = Instant.parse(fechaFin);
                    query.addCriteria(Criteria.where("timestamp").gte(start).lte(end));
                } else {
                    query.addCriteria(Criteria.where("timestamp").gte(start));
                }
            } catch (Exception e) {
                log.warn("Error parseando fechaInicio: {}", fechaInicio, e);
            }
        } else if (fechaFin != null && !fechaFin.trim().isEmpty()) {
            try {
                Instant end = Instant.parse(fechaFin);
                query.addCriteria(Criteria.where("timestamp").lte(end));
            } catch (Exception e) {
                log.warn("Error parseando fechaFin: {}", fechaFin, e);
            }
        }

        query.with(Sort.by(Sort.Direction.DESC, "timestamp"));
        return mongoTemplate.find(query, AuditLog.class);
    }
}

package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.AuditLog;
import com.bpm.inteligente.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repo;

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
        return repo.findByTenantIdOrderByTimestampDesc(tenantId);
    }
}

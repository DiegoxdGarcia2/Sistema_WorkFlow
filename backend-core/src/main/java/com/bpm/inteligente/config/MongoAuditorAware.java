package com.bpm.inteligente.config;

import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Proveedor de auditoría para Spring Data MongoDB.
 * Lee el userId actual del TenantContext (poblado por JwtAuthenticationFilter)
 * para anotar automáticamente @CreatedBy y @LastModifiedBy.
 */
@Component("auditorAware")
public class MongoAuditorAware implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        return Optional.ofNullable(TenantContext.getCurrentUserId());
    }
}

package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Cliente;
import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.Tenant;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.repository.ClienteRepository;
import com.bpm.inteligente.repository.PoliticaNegocioRepository;
import com.bpm.inteligente.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Genera rutas S3 legibles con nombres reales en lugar de UUIDs.
 * Estructura: tenants/{NombreTenant}/clientes/{NombreCliente}/politicas/{NombrePolitica}/tramites/{CodigoTramite}/archivo.pdf
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class S3KeyBuilderService {

    private final TenantRepository tenantRepository;
    private final ClienteRepository clienteRepository;
    private final PoliticaNegocioRepository politicaRepository;

    /**
     * Construye una key S3 legible para un trámite dado.
     * Ejemplo: tenants/CRE/clientes/Diego_Garcia/politicas/Instalacion_Medidor/tramites/CRE-MED-001/v1_archivo.pdf
     */
    public String buildKey(Tramite tramite, String filename) {
        String tenantName = resolvetenantName(tramite.getTenantId());
        String clienteName = resolveClienteName(tramite.getClienteId());
        String politicaName = resolvePoliticaName(tramite.getPoliticaId());
        String tramiteLabel = resolveTramiteLabel(tramite);

        return String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/%s",
                sanitize(tenantName), sanitize(clienteName), sanitize(politicaName), sanitize(tramiteLabel), filename);
    }

    private String resolvetenantName(String tenantId) {
        if (tenantId == null || tenantId.isEmpty()) return "sin-tenant";
        try {
            return tenantRepository.findById(tenantId)
                    .map(Tenant::getNombre)
                    .orElse(tenantId);
        } catch (Exception e) {
            log.warn("No se pudo resolver nombre de tenant {}: {}", tenantId, e.getMessage());
            return tenantId;
        }
    }

    private String resolveClienteName(String clienteId) {
        if (clienteId == null || clienteId.isEmpty()) return "sin-cliente";
        try {
            return clienteRepository.findById(clienteId)
                    .map(c -> {
                        String nombre = c.getNombre() != null ? c.getNombre() : "";
                        String apellido = c.getApellido() != null ? c.getApellido() : "";
                        String full = (nombre + " " + apellido).trim();
                        return full.isEmpty() ? clienteId : full;
                    })
                    .orElse(clienteId);
        } catch (Exception e) {
            log.warn("No se pudo resolver nombre de cliente {}: {}", clienteId, e.getMessage());
            return clienteId;
        }
    }

    private String resolvePoliticaName(String politicaId) {
        if (politicaId == null || politicaId.isEmpty()) return "sin-politica";
        try {
            return politicaRepository.findById(politicaId)
                    .map(PoliticaNegocio::getNombre)
                    .orElse(politicaId);
        } catch (Exception e) {
            log.warn("No se pudo resolver nombre de politica {}: {}", politicaId, e.getMessage());
            return politicaId;
        }
    }

    private String resolveTramiteLabel(Tramite tramite) {
        // Preferir código de seguimiento (ej: CRE-MED-001), luego clienteNombre + id
        if (tramite.getCodigoSeguimiento() != null && !tramite.getCodigoSeguimiento().isEmpty()) {
            return tramite.getCodigoSeguimiento();
        }
        return tramite.getId();
    }

    /**
     * Limpia caracteres no permitidos en rutas S3 para mantener nombres legibles y seguros.
     * Reemplaza caracteres especiales con guiones bajos, mantiene acentos y espacios como guiones bajos.
     */
    private String sanitize(String name) {
        if (name == null || name.isEmpty()) return "desconocido";
        // Reemplazar caracteres no seguros para S3 keys  
        return name.trim()
                .replaceAll("[\\\\/:*?\"<>|#%&{}\\[\\]@!$^+`~=]", "_") // Caracteres no permitidos
                .replaceAll("\\s+", "_")  // Espacios → guiones bajos
                .replaceAll("_+", "_")    // Múltiples guiones bajos → uno solo
                .replaceAll("^_|_$", ""); // Quitar guiones bajos al inicio/final
    }
}

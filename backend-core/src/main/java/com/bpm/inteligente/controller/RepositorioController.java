package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.DocumentoVersionado;
import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.dto.RepositorioDTO;
import com.bpm.inteligente.repository.DocumentoVersionadoRepository;
import com.bpm.inteligente.repository.PoliticaNegocioRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.bpm.inteligente.config.TenantContext;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/repositorio")
@RequiredArgsConstructor
public class RepositorioController {

    private final DocumentoVersionadoRepository documentoRepository;
    private final TramiteRepository tramiteRepository;
    private final PoliticaNegocioRepository politicaRepository;

    @GetMapping("/agrupado")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO')")
    public ResponseEntity<RepositorioDTO> getRepositorio(
            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        
        String tenantId = tenantIdHeader;
        if (tenantId == null || tenantId.trim().isEmpty()) {
            tenantId = TenantContext.getCurrentTenant();
        }

        log.info("Consultando repositorio agrupado para tenant: {}", tenantId);
        
        if (tenantId == null || tenantId.trim().isEmpty()) {
            log.warn("No tenant ID found in request headers or authentication context");
            return ResponseEntity.badRequest().build();
        }
        
        List<DocumentoVersionado> documentos = documentoRepository.findByTenantIdAndEstado(tenantId, "ACTIVO");
        if (documentos.isEmpty()) {
            return ResponseEntity.ok(RepositorioDTO.builder().agrupacion(new HashMap<>()).build());
        }

        List<Tramite> tramites = tramiteRepository.findByTenantId(tenantId);
        List<PoliticaNegocio> politicas = politicaRepository.findByTenantId(tenantId);

        Map<String, String> politicaNombreMap = politicas.stream()
            .collect(Collectors.toMap(PoliticaNegocio::getId, PoliticaNegocio::getNombre, (a, b) -> a));

        Map<String, Tramite> tramiteMap = tramites.stream()
            .collect(Collectors.toMap(Tramite::getId, t -> t, (a, b) -> a));

        // Key: PoliticaNombre -> Key: ClienteNombre -> List<DocumentoVersionado>
        Map<String, Map<String, List<DocumentoVersionado>>> agrupacion = new HashMap<>();

        for (DocumentoVersionado doc : documentos) {
            Tramite t = tramiteMap.get(doc.getTramiteId());
            if (t == null) continue;

            String politicaNombre = politicaNombreMap.getOrDefault(t.getPoliticaId(), "Sin Política");
            String clienteNombre = t.getClienteNombre() != null && !t.getClienteNombre().trim().isEmpty() 
                                   ? t.getClienteNombre() : "Cliente Desconocido";

            agrupacion.putIfAbsent(politicaNombre, new HashMap<>());
            Map<String, List<DocumentoVersionado>> clientesMap = agrupacion.get(politicaNombre);
            
            clientesMap.putIfAbsent(clienteNombre, new ArrayList<>());
            clientesMap.get(clienteNombre).add(doc);
        }

        return ResponseEntity.ok(RepositorioDTO.builder().agrupacion(agrupacion).build());
    }
}

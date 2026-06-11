package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.DocumentoVersionado;
import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.repository.DocumentoVersionadoRepository;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import com.bpm.inteligente.service.S3StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/migration")
public class MigrationController {

    private final DocumentoVersionadoRepository docRepository;
    private final RegistroActividadRepository registroRepository;
    private final TramiteRepository tramiteRepository;
    private final S3StorageService s3StorageService;

    public MigrationController(DocumentoVersionadoRepository docRepository,
                               RegistroActividadRepository registroRepository,
                               TramiteRepository tramiteRepository,
                               S3StorageService s3StorageService) {
        this.docRepository = docRepository;
        this.registroRepository = registroRepository;
        this.tramiteRepository = tramiteRepository;
        this.s3StorageService = s3StorageService;
    }

    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> runMigration() {
        log.info("🚀 Iniciando migración de archivos planos a estructura organizada...");
        int migratedDocs = 0;
        int migratedRegistros = 0;
        int docErrors = 0;
        int registroErrors = 0;

        // Cargar todos los trámites en memoria para evitar N+1 queries
        List<Tramite> tramites = tramiteRepository.findAll();
        Map<String, Tramite> tramiteMap = tramites.stream()
                .filter(t -> t.getId() != null)
                .collect(Collectors.toMap(Tramite::getId, t -> t, (a, b) -> a));
        log.info("Cargados {} trámites en memoria para la migración", tramiteMap.size());

        // Map para evitar duplicar migración de la misma clave si está en múltiples sitios
        Map<String, String> keyMapping = new HashMap<>();

        // 1. Migrar Documentos Versionados
        List<DocumentoVersionado> documentos = docRepository.findAll();
        for (DocumentoVersionado doc : documentos) {
            boolean modified = false;
            Tramite tramite = tramiteMap.get(doc.getTramiteId());

            if (tramite == null) {
                log.warn("Trámite no encontrado para documento versionado: {}, omitiendo", doc.getId());
                continue;
            }

            if (doc.getHistorial() != null) {
                for (DocumentoVersionado.Revision revision : doc.getHistorial()) {
                    String oldKey = revision.getS3Key();
                    if (oldKey != null && !oldKey.startsWith("tenants/")) {
                        try {
                            String newKey = keyMapping.get(oldKey);
                            if (newKey == null) {
                                byte[] content = s3StorageService.downloadFile(oldKey);
                                String ext = "";
                                if (oldKey.contains(".")) {
                                    ext = oldKey.substring(oldKey.lastIndexOf("."));
                                }
                                String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
                                String uuid = UUID.randomUUID().toString();
                                
                                // tenants/{tenantId}/clientes/{clienteId}/politicas/{politicaId}/tramites/{tramiteId}/{uuid}_{filename}
                                newKey = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/%s_%s",
                                        tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), uuid, doc.getNombreOriginal());
                                
                                // Subir archivo a nueva ruta
                                s3StorageService.uploadFile(newKey, content, getContentType(ext));
                                // Guardar en mapeo
                                keyMapping.put(oldKey, newKey);
                                // Eliminar archivo viejo
                                try {
                                    s3StorageService.deleteFile(oldKey);
                                } catch (Exception e) {
                                    log.warn("No se pudo eliminar archivo viejo en S3: {}", oldKey, e);
                                }
                            }

                            revision.setS3Key(newKey);
                            revision.setS3Url(s3StorageService.generatePresignedUrl(newKey));
                            modified = true;
                            migratedDocs++;
                        } catch (Exception e) {
                            log.error("Error al migrar revisión con key {} para documento {}", oldKey, doc.getId(), e);
                            docErrors++;
                        }
                    }
                }
            }

            if (modified) {
                docRepository.save(doc);
            }
        }

        // 2. Migrar Registros de Actividad (archivos adjuntos)
        List<RegistroActividad> registros = registroRepository.findAll();
        for (RegistroActividad registro : registros) {
            boolean modified = false;
            Tramite tramite = tramiteMap.get(registro.getTramiteId());

            if (tramite == null) {
                continue;
            }

            if (registro.getArchivos() != null) {
                for (RegistroActividad.ArchivoInfo archivo : registro.getArchivos()) {
                    String oldKey = archivo.getId();
                    if (oldKey != null && !oldKey.startsWith("tenants/")) {
                        try {
                            String newKey = keyMapping.get(oldKey);
                            if (newKey == null) {
                                byte[] content = s3StorageService.downloadFile(oldKey);
                                String ext = "";
                                if (oldKey.contains(".")) {
                                    ext = oldKey.substring(oldKey.lastIndexOf("."));
                                }
                                String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
                                String uuid = UUID.randomUUID().toString();
                                
                                newKey = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/%s_%s",
                                        tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), uuid, archivo.getNombre());
                                
                                s3StorageService.uploadFile(newKey, content, getContentType(ext));
                                keyMapping.put(oldKey, newKey);
                                try {
                                    s3StorageService.deleteFile(oldKey);
                                } catch (Exception e) {
                                    log.warn("No se pudo eliminar archivo viejo en RegistroActividad S3: {}", oldKey, e);
                                }
                            }

                            archivo.setId(newKey);
                            archivo.setPath("/api/archivos/download/" + newKey);
                            modified = true;
                            migratedRegistros++;
                        } catch (Exception e) {
                            log.error("Error al migrar archivo con id {} para registro {}", oldKey, registro.getId(), e);
                            registroErrors++;
                        }
                    }
                }
            }

            if (modified) {
                registroRepository.save(registro);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("documentosMigrados", migratedDocs);
        response.put("registrosMigrados", migratedRegistros);
        response.put("erroresDocumentos", docErrors);
        response.put("erroresRegistros", registroErrors);
        response.put("totalMapeados", keyMapping.size());
        
        log.info("✅ Migración finalizada con éxito: {}", response);
        return ResponseEntity.ok(response);
    }

    private String getContentType(String ext) {
        if (ext == null) return "application/octet-stream";
        switch (ext.toLowerCase()) {
            case ".pdf": return "application/pdf";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            case ".png": return "image/png";
            case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default: return "application/octet-stream";
        }
    }
}

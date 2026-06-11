package com.bpm.inteligente.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.HandlerMapping;

import com.bpm.inteligente.service.S3StorageService;
import com.bpm.inteligente.domain.DocumentoVersionado;
import com.bpm.inteligente.repository.DocumentoVersionadoRepository;

import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.repository.TramiteRepository;
import com.bpm.inteligente.exception.ResourceNotFoundException;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/archivos")
public class ArchivoController {

    private final S3StorageService s3StorageService;
    private final DocumentoVersionadoRepository documentoRepository;
    private final TramiteRepository tramiteRepository;

    public ArchivoController(S3StorageService s3StorageService, DocumentoVersionadoRepository documentoRepository, TramiteRepository tramiteRepository) {
        this.s3StorageService = s3StorageService;
        this.documentoRepository = documentoRepository;
        this.tramiteRepository = tramiteRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "tramiteId", required = false) String tramiteId) {
        String originalName = file.getOriginalFilename();
        System.out.println("📤 Iniciando subida a AWS S3: " + originalName + " (tramiteId: " + tramiteId + ")");
        try {
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            }

            // Validar formato y tamaño si hay tramiteId
            if (tramiteId != null && !tramiteId.trim().isEmpty()) {
                if (file.getSize() > 20 * 1024 * 1024) {
                    return ResponseEntity.badRequest().body("El archivo supera el límite de tamaño permitido de 20MB.");
                }
                if (!ext.equals(".pdf") && !ext.equals(".jpg") && !ext.equals(".jpeg") && !ext.equals(".png") && !ext.equals(".docx") && !ext.equals(".xlsx")) {
                    return ResponseEntity.badRequest().body("Formato de archivo no permitido. Solo se permiten PDF, imágenes, Word y Excel.");
                }
            }

            String key;
            if (tramiteId != null && !tramiteId.trim().isEmpty()) {
                Tramite tramite = tramiteRepository.findById(tramiteId)
                        .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));
                String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
                String uuid = UUID.randomUUID().toString();
                // tenants/{tenantId}/clientes/{clienteId}/politicas/{politicaId}/tramites/{tramiteId}/{uuid}_{filename}
                key = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/%s_%s",
                        tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), uuid, originalName);
            } else {
                key = UUID.randomUUID().toString() + ext;
            }

            // Subir a S3
            s3StorageService.uploadFile(key, file.getBytes(), file.getContentType());
            
            // La URL estática que se guardará en la BD será la ruta a nuestro endpoint de descarga
            String localDownloadUrl = "/api/archivos/download/" + key;

            System.out.println("✅ Subida exitosa a S3. Key: " + key);

            return ResponseEntity.ok(ArchivoResponse.builder()
                    .id(key)
                    .nombre(originalName)
                    .tipo(file.getContentType())
                    .tamano(file.getSize())
                    .subidoEn(Instant.now())
                    .url(localDownloadUrl)
                    .build());
        } catch (Exception e) {
            System.err.println("❌ ERROR en subida S3: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/upload-cliente")
    public ResponseEntity<?> uploadCliente(
            @RequestParam("file") MultipartFile file,
            @RequestParam("tramiteId") String tramiteId) {
        String originalName = file.getOriginalFilename();
        System.out.println("📤 Iniciando subida de cliente para tramiteId: " + tramiteId + ", archivo: " + originalName);
        try {
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf(".")).toLowerCase();
            }

            // Validaciones para móvil: 20MB y formatos permitidos
            if (file.getSize() > 20 * 1024 * 1024) {
                return ResponseEntity.badRequest().body("El archivo supera el límite de tamaño permitido de 20MB.");
            }
            if (!ext.equals(".pdf") && !ext.equals(".jpg") && !ext.equals(".jpeg") && !ext.equals(".png") && !ext.equals(".docx") && !ext.equals(".xlsx")) {
                return ResponseEntity.badRequest().body("Formato de archivo no permitido. Solo se permiten PDF, imágenes, Word y Excel.");
            }

            Tramite tramite = tramiteRepository.findById(tramiteId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", tramiteId));
            String clienteId = tramite.getClienteId() != null ? tramite.getClienteId() : "sin-cliente";
            String uuid = UUID.randomUUID().toString();
            // tenants/{tenantId}/clientes/{clienteId}/politicas/{politicaId}/tramites/{tramiteId}/{uuid}_{filename}
            String key = String.format("tenants/%s/clientes/%s/politicas/%s/tramites/%s/%s_%s",
                    tramite.getTenantId(), clienteId, tramite.getPoliticaId(), tramite.getId(), uuid, originalName);

            s3StorageService.uploadFile(key, file.getBytes(), file.getContentType());
            String localDownloadUrl = "/api/archivos/download/" + key;

            System.out.println("✅ Subida cliente exitosa. Key: " + key);

            return ResponseEntity.ok(ArchivoResponse.builder()
                    .id(key)
                    .nombre(originalName)
                    .tipo(file.getContentType())
                    .tamano(file.getSize())
                    .subidoEn(Instant.now())
                    .url(localDownloadUrl)
                    .build());
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            System.err.println("❌ ERROR en subida cliente: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/download/**")
    public ResponseEntity<?> download(HttpServletRequest request) {
        try {
            String fullPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
            String key = fullPath.substring(fullPath.indexOf("/download/") + 10);
            try {
                key = java.net.URLDecoder.decode(key, java.nio.charset.StandardCharsets.UTF_8);
            } catch (Exception e) {
                System.err.println("⚠️ Error al decodificar la clave de descarga: " + e.getMessage());
            }

            // Intentar resolver si la clave es el ID de un DocumentoVersionado en MongoDB
            Optional<DocumentoVersionado> docOpt = documentoRepository.findById(key);
            if (docOpt.isPresent()) {
                DocumentoVersionado doc = docOpt.get();
                int currentVersion = doc.getVersionActual();
                DocumentoVersionado.Revision revision = doc.getHistorial().stream()
                        .filter(r -> r.getVersion() == currentVersion)
                        .findFirst()
                        .orElse(doc.getHistorial().isEmpty() ? null : doc.getHistorial().get(doc.getHistorial().size() - 1));
                if (revision != null && revision.getS3Key() != null) {
                    System.out.println("🔄 Resolviendo documento ID: " + key + " a clave S3: " + revision.getS3Key());
                    key = revision.getS3Key();
                }
            }

            // Si estamos en modo simulado (desarrollo local sin AWS real), servimos el archivo directamente desde el disco
            if (s3StorageService.isMockMode()) {
                java.nio.file.Path targetPath = java.nio.file.Paths.get("uploads", key);
                if (java.nio.file.Files.exists(targetPath)) {
                    byte[] fileBytes = java.nio.file.Files.readAllBytes(targetPath);
                    String contentType = "application/octet-stream";
                    if (key.endsWith(".pdf")) {
                        contentType = "application/pdf";
                    } else if (key.endsWith(".png")) {
                        contentType = "image/png";
                    } else if (key.endsWith(".jpg") || key.endsWith(".jpeg")) {
                        contentType = "image/jpeg";
                    }
                    System.out.println("✅ [MOCK] Sirviendo archivo localmente: " + targetPath.toAbsolutePath());
                    return ResponseEntity.ok()
                            .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                            .body(fileBytes);
                } else {
                    System.err.println("❌ [MOCK] Archivo no encontrado en disco local: " + targetPath.toAbsolutePath());
                    return ResponseEntity.notFound().build();
                }
            }

            // Generar URL prefirmada temporal
            String presignedUrl = s3StorageService.generatePresignedUrl(key);
            
            // Redirigir al cliente a la URL de S3 directamente (HTTP 302)
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(presignedUrl)).build();
        } catch (Exception e) {
            System.err.println("❌ Error en download S3: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchivoResponse {
        private String id;
        private String nombre;
        private String tipo;
        private long tamano;
        private Instant subidoEn;
        private String url;
    }
}

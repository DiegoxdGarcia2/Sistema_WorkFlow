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

    public ArchivoController(S3StorageService s3StorageService, DocumentoVersionadoRepository documentoRepository) {
        this.s3StorageService = s3StorageService;
        this.documentoRepository = documentoRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<ArchivoResponse> upload(@RequestParam("file") MultipartFile file) {
        String originalName = file.getOriginalFilename();
        System.out.println("📤 Iniciando subida a AWS S3: " + originalName);
        try {
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            
            String key = UUID.randomUUID().toString() + ext;
            
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

    @GetMapping("/download/**")
    public ResponseEntity<?> download(HttpServletRequest request) {
        try {
            String fullPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
            String key = fullPath.substring(fullPath.indexOf("/download/") + 10);

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

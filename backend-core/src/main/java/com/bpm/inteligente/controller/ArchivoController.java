package com.bpm.inteligente.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerMapping;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;

@RestController
@RequestMapping("/api/archivos")
public class ArchivoController {

    private final Cloudinary cloudinary;
    private final Path root = Paths.get("uploads");

    @Autowired
    public ArchivoController(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @PostMapping("/upload")
    public ResponseEntity<ArchivoResponse> upload(@RequestParam("file") MultipartFile file) {
        String originalName = file.getOriginalFilename();
        System.out.println("📤 Iniciando subida a CLOUDINARY: " + originalName);
        try {
            String contentType = file.getContentType();
            String resourceType = "auto";
            
            // Si es PDF o similar, forzar resource_type 'raw' para evitar bloqueos de 'image' en Cloudinary
            if (contentType != null && (contentType.contains("pdf") || contentType.contains("zip") || contentType.contains("msword"))) {
                resourceType = "raw";
            }

            // Public ID sin extensión (Cloudinary la maneja dinámicamente para imágenes)
            // Pero para 'raw' es mejor incluirla para que el link sea directo.
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            
            String customPublicId = UUID.randomUUID().toString();
            if ("raw".equals(resourceType)) {
                customPublicId += ext;
            }

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", resourceType,
                    "folder", "bpm_inteligente",
                    "public_id", customPublicId
            ));

            String url = (String) uploadResult.get("secure_url");
            String publicId = (String) uploadResult.get("public_id");

            System.out.println("✅ Subida exitosa [" + resourceType + "]: " + url);

            return ResponseEntity.ok(ArchivoResponse.builder()
                    .id(publicId)
                    .nombre(originalName)
                    .tipo(contentType)
                    .tamano(file.getSize())
                    .subidoEn(Instant.now())
                    .url(url)
                    .build());
        } catch (Exception e) {
            System.err.println("❌ ERROR en subida: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/download/**")
    public ResponseEntity<?> download(HttpServletRequest request) {
        try {
            String fullPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
            String filename = fullPath.substring(fullPath.indexOf("/download/") + 10);

            // Intentar detectar si es imagen o raw por la extensión en el nombre
            String type = "image";
            if (filename.toLowerCase().endsWith(".pdf") || filename.toLowerCase().endsWith(".docx") || filename.toLowerCase().endsWith(".zip")) {
                type = "raw";
            }

            if (filename.startsWith("bpm_inteligente/")) {
                String cloudUrl = "https://res.cloudinary.com/dfnseyypi/" + type + "/upload/" + filename;
                return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(cloudUrl)).build();
            }

            // 2. Si no, buscar localmente
            Path file = root.resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = Files.probeContentType(file);
                if (contentType == null) contentType = "application/octet-stream";

                String disposition = (contentType.equals("application/pdf") || contentType.startsWith("image/")) 
                    ? "inline" : "attachment";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("❌ Error en download: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
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

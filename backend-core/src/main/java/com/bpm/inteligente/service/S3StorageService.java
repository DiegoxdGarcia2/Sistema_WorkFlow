package com.bpm.inteligente.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket:bucket-bpm}")
    private String bucketName;

    @Value("${aws.credentials.access-key:}")
    private String accessKey;

    /**
     * Sube un archivo a S3.
     * Retorna la clave del archivo subido.
     */
    public String uploadFile(String key, byte[] content, String contentType) {
        log.info("Subiendo archivo a S3 con key: {}, bucket: {}", key, bucketName);
        
        // Si estamos usando credenciales mock (desarrollo local sin AWS real), guardamos el archivo en disco local.
        if (isMockMode()) {
            log.info("[MOCK] Guardando archivo localmente para simular S3: {}", key);
            try {
                Path targetPath = Paths.get("uploads", key);
                Files.createDirectories(targetPath.getParent());
                Files.write(targetPath, content);
                log.info("[MOCK] Archivo guardado de manera exitosa en: {}", targetPath.toAbsolutePath());
            } catch (Exception e) {
                log.error("[MOCK] Error al guardar archivo localmente: {}", e.getMessage(), e);
                throw new RuntimeException("Error al guardar archivo en simulación local: " + e.getMessage(), e);
            }
            return key;
        }

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(content));
            log.info("Archivo subido exitosamente a S3: {}", key);
            return key;
        } catch (Exception e) {
            log.error("Error al subir archivo a S3: {}", e.getMessage(), e);
            throw new RuntimeException("Error al almacenar el archivo en la nube: " + e.getMessage(), e);
        }
    }

    /**
     * Genera una URL prefirmada para descargar/visualizar el archivo.
     */
    public String generatePresignedUrl(String key) {
        log.info("Generando URL prefirmada para key: {}", key);

        if (isMockMode()) {
            String mockUrl = String.format("https://%s.s3.amazonaws.com/%s?mock-signature=true", bucketName, key);
            log.info("[MOCK] URL prefirmada generada: {}", mockUrl);
            return mockUrl;
        }

        try {
            GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15)) // URL válida por 15 minutos
                    .getObjectRequest(builder -> builder.bucket(bucketName).key(key).build())
                    .build();

            PresignedGetObjectRequest presignedGetObjectRequest = s3Presigner.presignGetObject(getObjectPresignRequest);
            String url = presignedGetObjectRequest.url().toString();
            log.info("URL prefirmada generada de forma exitosa.");
            return url;
        } catch (Exception e) {
            log.error("Error al generar la URL prefirmada: {}", e.getMessage(), e);
            throw new RuntimeException("Error al generar la URL de visualización: " + e.getMessage(), e);
        }
    }

    /**
     * Descarga un archivo de S3 (o disco local si es modo simulado) como un arreglo de bytes.
     */
    public byte[] downloadFile(String key) {
        log.info("Descargando archivo de S3 con key: {}", key);
        if (isMockMode()) {
            try {
                Path targetPath = Paths.get("uploads", key);
                if (Files.exists(targetPath)) {
                    return Files.readAllBytes(targetPath);
                } else {
                    throw new RuntimeException("Archivo no encontrado en simulación local: " + key);
                }
            } catch (Exception e) {
                throw new RuntimeException("Error al descargar archivo local: " + e.getMessage(), e);
            }
        }
        try {
            software.amazon.awssdk.services.s3.model.GetObjectRequest getObjectRequest = software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            return s3Client.getObjectAsBytes(getObjectRequest).asByteArray();
        } catch (Exception e) {
            log.error("Error al descargar archivo de S3: {}", e.getMessage(), e);
            throw new RuntimeException("Error al descargar archivo de S3: " + e.getMessage(), e);
        }
    }

    /**
     * Elimina un archivo de S3.
     */
    public void deleteFile(String key) {
        log.info("Eliminando archivo de S3 con key: {}", key);

        if (isMockMode()) {
            log.info("[MOCK] Eliminando archivo local en simulación S3: {}", key);
            try {
                Path targetPath = Paths.get("uploads", key);
                if (Files.deleteIfExists(targetPath)) {
                    log.info("[MOCK] Archivo local eliminado exitosamente: {}", targetPath.toAbsolutePath());
                } else {
                    log.warn("[MOCK] El archivo local no existía para eliminar: {}", targetPath.toAbsolutePath());
                }
            } catch (Exception e) {
                log.error("[MOCK] Error al eliminar archivo local: {}", e.getMessage(), e);
            }
            return;
        }

        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("Archivo eliminado exitosamente de S3: {}", key);
        } catch (Exception e) {
            log.error("Error al eliminar archivo de S3: {}", e.getMessage(), e);
            throw new RuntimeException("Error al eliminar el archivo en la nube: " + e.getMessage(), e);
        }
    }

    public boolean isMockMode() {
        return accessKey == null || accessKey.trim().isEmpty() || accessKey.equals("mock_access_key");
    }
}

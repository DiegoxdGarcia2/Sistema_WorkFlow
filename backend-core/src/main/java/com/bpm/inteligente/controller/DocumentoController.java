package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.DocumentoVersionado;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.service.DocumentoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DocumentoController {

    private final DocumentoService documentoService;

    @PostMapping("/tramites/{tramiteId}/documentos")
    public ResponseEntity<DocumentoVersionado> subirDocumento(
            @PathVariable String tramiteId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Usuario usuario) throws IOException {
        
        log.info("REST request to upload document: {} for tramite: {}", file.getOriginalFilename(), tramiteId);
        DocumentoVersionado doc = documentoService.subirDocumento(
                tramiteId,
                file.getOriginalFilename(),
                file.getBytes(),
                file.getContentType(),
                usuario
        );
        return ResponseEntity.ok(doc);
    }

    @PutMapping("/tramites/{tramiteId}/documentos/{documentoId}")
    public ResponseEntity<DocumentoVersionado> subirNuevaVersion(
            @PathVariable String tramiteId,
            @PathVariable String documentoId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Usuario usuario) throws IOException {
        
        log.info("REST request to upload new version of document: {} for tramite: {}", documentoId, tramiteId);
        DocumentoVersionado doc = documentoService.subirNuevaVersion(
                documentoId,
                file.getBytes(),
                file.getContentType(),
                usuario
        );
        return ResponseEntity.ok(doc);
    }

    @GetMapping("/tramites/{tramiteId}/documentos")
    public ResponseEntity<List<DocumentoVersionado>> listarDocumentos(
            @PathVariable String tramiteId,
            @AuthenticationPrincipal Usuario usuario) {
        
        log.info("REST request to list documents for tramite: {}", tramiteId);
        List<DocumentoVersionado> documentos = documentoService.listarDocumentos(tramiteId, usuario);
        return ResponseEntity.ok(documentos);
    }

    @GetMapping("/tramites/{tramiteId}/documentos/{documentoId}/historial")
    public ResponseEntity<List<DocumentoVersionado.Revision>> obtenerHistorial(
            @PathVariable String tramiteId,
            @PathVariable String documentoId,
            @AuthenticationPrincipal Usuario usuario) {
        
        log.info("REST request to get history for document: {}", documentoId);
        List<DocumentoVersionado.Revision> historial = documentoService.obtenerHistorial(documentoId, usuario);
        return ResponseEntity.ok(historial);
    }

    @GetMapping("/documentos/{documentoId}/version/{version}/preview")
    public ResponseEntity<Map<String, String>> obtenerUrlVistaPrevia(
            @PathVariable String documentoId,
            @PathVariable int version,
            @AuthenticationPrincipal Usuario usuario) {
        
        log.info("REST request to get preview URL for document: {}, version: {}", documentoId, version);
        String url = documentoService.obtenerUrlVistaPrevia(documentoId, version, usuario);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/documentos/{documentoId}")
    public ResponseEntity<DocumentoVersionado> eliminarDocumento(
            @PathVariable String documentoId,
            @AuthenticationPrincipal Usuario usuario) {
        
        log.info("REST request to delete document: {}", documentoId);
        DocumentoVersionado doc = documentoService.eliminarDocumento(documentoId, usuario);
        return ResponseEntity.ok(doc);
    }
}

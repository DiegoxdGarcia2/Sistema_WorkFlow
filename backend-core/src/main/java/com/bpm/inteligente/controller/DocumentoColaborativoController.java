package com.bpm.inteligente.controller;

import com.bpm.inteligente.config.TenantContext;
import com.bpm.inteligente.domain.DocumentoColaborativo;
import com.bpm.inteligente.domain.DocumentoVersionado;
import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/documentos-colaborativos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentoColaborativoController {

    private final DocumentoColaborativoRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final DocumentoVersionadoRepository documentoRepository;
    private final TramiteRepository tramiteRepository;
    private final PoliticaNegocioRepository politicaRepository;

    @GetMapping("/{documentoId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO')")
    public ResponseEntity<DocumentoColaborativo> getOrCreateDocument(@PathVariable String documentoId) {
        String userId = TenantContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        String deptoId = usuario.getDepartamentoId() != null && !usuario.getDepartamentoId().trim().isEmpty()
                ? usuario.getDepartamentoId() : "general";

        String lookupId = documentoId + "_" + deptoId;

        Optional<DocumentoColaborativo> docOpt = repository.findById(lookupId);
        if (docOpt.isPresent()) {
            DocumentoColaborativo doc = docOpt.get();
            // Verificar departamento
            if (!deptoId.equals(doc.getDepartamentoId()) && !usuario.getRol().name().equals("ADMINISTRADOR")) {
                log.warn("Usuario {} intentó acceder a documento de depto {} pero pertenece a {}",
                        usuario.getEmail(), doc.getDepartamentoId(), deptoId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(doc);
        }

        // Si no existe, cargar DocumentoVersionado para resolver metadatos
        DocumentoVersionado docVer = documentoRepository.findById(documentoId)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoVersionado", "id", documentoId));

        Tramite tramite = tramiteRepository.findById(docVer.getTramiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Tramite", "id", docVer.getTramiteId()));

        // Obtener nombres de Política
        String politicaNombre = "Sin Política";
        if (tramite.getPoliticaId() != null) {
            politicaNombre = politicaRepository.findById(tramite.getPoliticaId())
                    .map(com.bpm.inteligente.domain.PoliticaNegocio::getNombre)
                    .orElse("Sin Política");
        }

        String clienteNombre = tramite.getClienteNombre() != null && !tramite.getClienteNombre().trim().isEmpty()
                ? tramite.getClienteNombre() : "Cliente Desconocido";

        // Crear una nueva nota colaborativa inicial para este documento y departamento
        DocumentoColaborativo doc = DocumentoColaborativo.builder()
                .id(lookupId)
                .politicaNombre(politicaNombre)
                .clienteNombre(clienteNombre)
                .departamentoId(deptoId)
                .titulo("Notas: " + docVer.getNombreOriginal())
                .contenido("# Notas de Trabajo Colaborativo - " + docVer.getNombreOriginal() + "\n\n" +
                        "**Archivo Original:** " + docVer.getNombreOriginal() + "\n" +
                        "**Política:** " + politicaNombre + "\n" +
                        "**Cliente:** " + clienteNombre + "\n\n" +
                        "Comienza a redactar notas, revisiones o reportes colaborativos sobre este documento aquí...")
                .ultimoEditor(usuario.getNombre() + " " + usuario.getApellido())
                .actualizadoEn(Instant.now())
                .build();

        doc = repository.save(doc);
        log.info("Creado nuevo documento colaborativo asociado al archivo {} y depto {} con ID: {}", 
                docVer.getNombreOriginal(), deptoId, doc.getId());

        return ResponseEntity.ok(doc);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'FUNCIONARIO')")
    public ResponseEntity<DocumentoColaborativo> saveDocument(
            @PathVariable String id,
            @RequestBody DocumentoColaborativo docBody) {

        String userId = TenantContext.getCurrentUserId();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Usuario usuario = usuarioRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", "id", userId));

        DocumentoColaborativo doc = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("DocumentoColaborativo", "id", id));

        // Validación de departamento
        String deptoId = usuario.getDepartamentoId() != null ? usuario.getDepartamentoId() : "general";
        if (!deptoId.equals(doc.getDepartamentoId()) && !usuario.getRol().name().equals("ADMINISTRADOR")) {
            log.warn("Usuario {} intentó editar un documento del departamento {} pero pertenece a {}",
                    usuario.getEmail(), doc.getDepartamentoId(), deptoId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        doc.setContenido(docBody.getContenido());
        doc.setTitulo(docBody.getTitulo() != null ? docBody.getTitulo() : doc.getTitulo());
        doc.setUltimoEditor(usuario.getNombre() + " " + usuario.getApellido());
        doc.setActualizadoEn(Instant.now());

        DocumentoColaborativo saved = repository.save(doc);
        return ResponseEntity.ok(saved);
    }
}

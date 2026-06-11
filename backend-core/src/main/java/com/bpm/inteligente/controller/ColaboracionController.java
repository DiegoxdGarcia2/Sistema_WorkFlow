package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.ColaboradorDTO;
import com.bpm.inteligente.dto.SocketMessageDTO;
import com.bpm.inteligente.service.ColaboracionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Set;

@Slf4j
@Controller
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ColaboracionController {

    private final ColaboracionService colaboracionService;

    @MessageMapping("/politica/{politicaId}/join")
    public void joinRoom(@DestinationVariable String politicaId, @Payload ColaboradorDTO colaborador, @org.springframework.messaging.handler.annotation.Header("simpSessionId") String sessionId) {
        log.info("Colaborador {} se unió a la política {} (Session: {})", colaborador.getNombre(), politicaId, sessionId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.joinRoom(politicaId, colaborador, sessionId);
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        colaboracionService.publishToRoom(politicaId, msg);
    }

    @MessageMapping("/politica/{politicaId}/leave")
    public void leaveRoom(@DestinationVariable String politicaId, @Payload ColaboradorDTO colaborador) {
        log.info("Colaborador {} salió de la política {}", colaborador.getNombre(), politicaId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.leaveRoom(politicaId, colaborador.getId());
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        colaboracionService.publishToRoom(politicaId, msg);
    }

    @MessageMapping("/politica/{politicaId}/node-editing")
    public void nodeEditing(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Actualizamos el estado de qué nodo está tocando
        // JACKSON deserializa el payload como LinkedHashMap en producción, evitamos ClassCastException
        Object raw = message.getPayload();
        String nodoId = raw != null ? raw.toString() : null;
        
        colaboracionService.updateColaboradorStatus(politicaId, message.getColaborador().getId(), nodoId);
        
        // Retransmitimos para que los demás lo bloqueen
        colaboracionService.publishToRoom(politicaId, message);
    }

    @MessageMapping("/politica/{politicaId}/node-moved")
    public void nodeMoved(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Simplemente retransmitimos el movimiento a todos los demás en la sala
        colaboracionService.publishToRoom(politicaId, message);
    }

    @MessageMapping("/politica/{politicaId}/policy-updated")
    public void policyUpdated(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Retransmitimos el estado completo de la política a todos los colaboradores de la sala
        // El payload contiene el JSON completo de la PoliticaDTO actualizada
        log.info("Política {} actualizada por {}. Retransmitiendo a la sala.", politicaId,
                message.getColaborador() != null ? message.getColaborador().getNombre() : "desconocido");
        colaboracionService.publishToRoom(politicaId, message);
    }

    // ── WebSocket Endpoints para Colaboración en Documentos ──

    @MessageMapping("/documento/{docId}/join")
    public void joinDocRoom(@DestinationVariable String docId, @Payload ColaboradorDTO colaborador, @org.springframework.messaging.handler.annotation.Header("simpSessionId") String sessionId) {
        log.info("Colaborador {} se unió al documento {} (Session: {})", colaborador.getNombre(), docId, sessionId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.joinDocRoom(docId, colaborador, sessionId);
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        colaboracionService.publishToDocRoom(docId, msg);
    }

    @MessageMapping("/documento/{docId}/leave")
    public void leaveDocRoom(@DestinationVariable String docId, @Payload ColaboradorDTO colaborador) {
        log.info("Colaborador {} salió del documento {}", colaborador.getNombre(), docId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.leaveDocRoom(docId, colaborador.getId());
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        colaboracionService.publishToDocRoom(docId, msg);
    }

    @MessageMapping("/documento/{docId}/edit")
    public void docEdit(@DestinationVariable String docId, @Payload SocketMessageDTO message) {
        // Retransmitir cambios de texto del documento a todos los demás en la sala
        colaboracionService.publishToDocRoom(docId, message);
    }

    @MessageMapping("/documento/{docId}/cursor")
    public void docCursor(@DestinationVariable String docId, @Payload SocketMessageDTO message) {
        // Retransmitir movimientos de cursor a la sala
        colaboracionService.publishToDocRoom(docId, message);
    }

    @MessageMapping("/documento/{docId}/log")
    public void docLog(@DestinationVariable String docId, @Payload SocketMessageDTO message) {
        // Retransmitir log de actividad (join, edit, undo, redo, format) a la sala
        colaboracionService.publishToDocRoom(docId, message);
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/colaboracion/documento/{docId}/colaboradores")
    @org.springframework.web.bind.annotation.ResponseBody
    public Set<ColaboradorDTO> getDocColaboradores(@org.springframework.web.bind.annotation.PathVariable String docId) {
        return colaboracionService.getDocColaboradores(docId);
    }
}


package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.ColaboradorDTO;
import com.bpm.inteligente.dto.SocketMessageDTO;
import com.bpm.inteligente.service.ColaboracionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Set;

@Slf4j
@Controller
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ColaboracionController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ColaboracionService colaboracionService;

    @MessageMapping("/politica/{politicaId}/join")
    public void joinRoom(@DestinationVariable String politicaId, @Payload ColaboradorDTO colaborador, StompHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        log.info("Colaborador {} se unió a la política {} (Session: {})", colaborador.getNombre(), politicaId, sessionId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.joinRoom(politicaId, colaborador, sessionId);
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        messagingTemplate.convertAndSend("/topic/politica/" + politicaId, msg);
    }

    @MessageMapping("/politica/{politicaId}/leave")
    public void leaveRoom(@DestinationVariable String politicaId, @Payload ColaboradorDTO colaborador) {
        log.info("Colaborador {} salió de la política {}", colaborador.getNombre(), politicaId);
        Set<ColaboradorDTO> colaboradores = colaboracionService.leaveRoom(politicaId, colaborador.getId());
        
        SocketMessageDTO msg = SocketMessageDTO.builder()
                .type("ROOM_STATE")
                .payload(colaboradores)
                .build();
                
        messagingTemplate.convertAndSend("/topic/politica/" + politicaId, msg);
    }

    @MessageMapping("/politica/{politicaId}/node-editing")
    public void nodeEditing(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Actualizamos el estado de qué nodo está tocando
        String nodoId = (String) message.getPayload();
        colaboracionService.updateColaboradorStatus(politicaId, message.getColaborador().getId(), nodoId);
        
        // Retransmitimos para que los demás lo bloqueen
        messagingTemplate.convertAndSend("/topic/politica/" + politicaId, message);
    }

    @MessageMapping("/politica/{politicaId}/node-moved")
    public void nodeMoved(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Simplemente retransmitimos el movimiento a todos los demás en la sala
        messagingTemplate.convertAndSend("/topic/politica/" + politicaId, message);
    }

    @MessageMapping("/politica/{politicaId}/policy-updated")
    public void policyUpdated(@DestinationVariable String politicaId, @Payload SocketMessageDTO message) {
        // Retransmitimos el estado completo de la política a todos los colaboradores de la sala
        // El payload contiene el JSON completo de la PoliticaDTO actualizada
        log.info("Política {} actualizada por {}. Retransmitiendo a la sala.", politicaId,
                message.getColaborador() != null ? message.getColaborador().getNombre() : "desconocido");
        messagingTemplate.convertAndSend("/topic/politica/" + politicaId, message);
    }
}

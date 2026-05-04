package com.bpm.inteligente.config;

import com.bpm.inteligente.service.ColaboracionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final ColaboracionService colaboracionService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        log.info("Nueva conexión WebSocket establecida");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        log.info("Conexión WebSocket cerrada: {}", sessionId);
        
        // Notificar al servicio para limpiar el colaborador de las salas
        colaboracionService.handleDisconnect(sessionId);
    }
}

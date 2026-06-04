package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.dto.SocketMessageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * Envía una notificación en tiempo real a Redis, la cual se retransmitirá 
     * por WebSocket al cliente correspondiente.
     */
    public void enviarNotificacionTramite(Tramite tramite, String tipo, String mensaje) {
        if (tramite.getClienteId() == null || tramite.getClienteId().trim().isEmpty()) {
            log.warn("El trámite {} no posee clienteId asociado, se omite la notificación.", tramite.getId());
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("tramiteId", tramite.getId());
        payload.put("codigoSeguimiento", tramite.getCodigoSeguimiento());
        payload.put("politicaId", tramite.getPoliticaId());
        payload.put("estado", tramite.getEstado().name());
        payload.put("mensaje", mensaje);

        SocketMessageDTO socketMessage = SocketMessageDTO.builder()
                .type(tipo)
                .payload(payload)
                .build();

        String channel = "websocket:tramite:cliente:" + tramite.getClienteId();
        log.info("Publicando notificación en canal '{}': {}", channel, mensaje);
        
        try {
            redisTemplate.convertAndSend(channel, socketMessage);
        } catch (Exception e) {
            log.error("Fallo al publicar la notificación en Redis Pub/Sub", e);
        }
    }
}

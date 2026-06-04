package com.bpm.inteligente.config;

import com.bpm.inteligente.dto.SocketMessageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisWebSocketMessageListener implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String channel = new String(message.getChannel());
            log.debug("Redis Pub/Sub recibido en canal: {}", channel);
            
            String[] parts = channel.split(":");
            if (parts.length < 3) {
                log.warn("Formato de canal incorrecto: {}", channel);
                return;
            }
            
            String destination;
            if (channel.startsWith("websocket:documento:")) {
                destination = "/topic/documento/" + parts[2];
            } else if (channel.startsWith("websocket:tramite:cliente:")) {
                if (parts.length < 4) {
                    log.warn("Formato de canal de trámite cliente incorrecto: {}", channel);
                    return;
                }
                destination = "/topic/tramite/cliente/" + parts[3];
            } else {
                destination = "/topic/politica/" + parts[2];
            }

            SocketMessageDTO socketMessage = (SocketMessageDTO) redisTemplate.getValueSerializer()
                    .deserialize(message.getBody());
            
            if (socketMessage != null) {
                log.debug("Retransmitiendo evento {} a WebSocket local: {}", socketMessage.getType(), destination);
                messagingTemplate.convertAndSend(destination, socketMessage);
            }
        } catch (Exception e) {
            log.error("Error procesando mensaje Redis Pub/Sub", e);
        }
    }
}

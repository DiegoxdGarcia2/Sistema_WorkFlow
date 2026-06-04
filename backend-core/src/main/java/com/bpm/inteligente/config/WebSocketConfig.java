package com.bpm.inteligente.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${redis.host:localhost}")
    private String redisHost;

    @Value("${redis.port:6379}")
    private int redisPort;

    @Value("${redis.password:}")
    private String redisPassword;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // --- BROKER CONFIGURATION ---
        
        // OPCIÓN 1: Simple Broker (En memoria - Solo para 1 instancia)
        config.enableSimpleBroker("/topic");
        
        // OPCIÓN 2: External Broker Relay (Para escalar con Redis/RabbitMQ)
        /*
        config.enableStompBrokerRelay("/topic")
              .setRelayHost(redisHost)
              .setRelayPort(61613) // Puerto estándar STOMP
              .setClientLogin("guest")
              .setClientPasscode(redisPassword);
        */

        // Prefijo para los mensajes que se envían desde el cliente al servidor (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket Endpoint
        registry.addEndpoint("/ws-bpm")
                .setAllowedOriginPatterns("*");
                
        // Fallback SockJS Endpoint
        registry.addEndpoint("/ws-bpm-sockjs")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}

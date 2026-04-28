package com.bpm.inteligente.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita un broker en memoria para los prefijos /topic (broadcast) y /queue (unicast)
        config.enableSimpleBroker("/topic");
        
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

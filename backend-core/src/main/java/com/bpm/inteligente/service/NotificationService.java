package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Tramite;
import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.dto.SocketMessageDTO;
import com.bpm.inteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UsuarioRepository usuarioRepo;
    private final FirebaseMessagingService firebaseMessagingService;

    /**
     * Envía una notificación en tiempo real a Redis, la cual se retransmitirá 
     * por WebSocket al cliente correspondiente y por Push notification vía Firebase.
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

        // --- ENVIAR NOTIFICACIÓN PUSH VÍA FIREBASE (FCM) ---
        try {
            List<Usuario> usuarios = usuarioRepo.findByClienteId(tramite.getClienteId());
            if (usuarios != null && !usuarios.isEmpty()) {
                String title = "Actualización de Trámite";
                if (tipo != null) {
                    switch (tipo.toUpperCase()) {
                        case "TRAMITE_INICIADO":
                            title = "Nuevo Trámite Iniciado";
                            break;
                        case "TRAMITE_EN_PROGRESO":
                            title = "Trámite en Progreso";
                            break;
                        case "TRAMITE_PASO_ACTUALIZADO":
                            title = "Trámite Avanzado";
                            break;
                        case "TRAMITE_COMPLETADO":
                            title = "¡Trámite Completado!";
                            break;
                        case "TRAMITE_CANCELADO":
                            title = "Trámite Cancelado";
                            break;
                    }
                }

                Map<String, String> fcmData = new HashMap<>();
                fcmData.put("tramiteId", tramite.getId() != null ? tramite.getId() : "");
                fcmData.put("type", tipo != null ? tipo : "");
                fcmData.put("mensaje", mensaje != null ? mensaje : "");

                for (Usuario user : usuarios) {
                    if (user.getFcmToken() != null && !user.getFcmToken().trim().isEmpty()) {
                        firebaseMessagingService.enviarNotificacionPush(
                                user.getFcmToken(),
                                title,
                                mensaje,
                                fcmData
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error al procesar el envío de notificación push", e);
        }
    }

    /**
     * Envía una notificación para solicitar documentos de prerrequisitos o un paso del trámite.
     */
    public void enviarNotificacionDocumentoRequerido(Tramite tramite, String tipo, String mensaje, List<String> documentosRequeridos, String actividadNombre) {
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
        payload.put("documentosRequeridos", documentosRequeridos);
        if (actividadNombre != null) {
            payload.put("actividadNombre", actividadNombre);
        }

        SocketMessageDTO socketMessage = SocketMessageDTO.builder()
                .type(tipo)
                .payload(payload)
                .build();

        String channel = "websocket:tramite:cliente:" + tramite.getClienteId();
        log.info("Publicando notificación de documentos requeridos en canal '{}': {}", channel, mensaje);
        
        try {
            redisTemplate.convertAndSend(channel, socketMessage);
        } catch (Exception e) {
            log.error("Fallo al publicar la notificación de documentos en Redis Pub/Sub", e);
        }

        // --- ENVIAR NOTIFICACIÓN PUSH VÍA FIREBASE (FCM) ---
        try {
            List<Usuario> usuarios = usuarioRepo.findByClienteId(tramite.getClienteId());
            if (usuarios != null && !usuarios.isEmpty()) {
                String title = "Se requiere un documento";
                if ("PREREQUISITOS_REQUERIDOS".equals(tipo)) {
                    title = "Documentos Requeridos";
                } else if ("DOCUMENTO_REQUERIDO_PASO".equals(tipo)) {
                    title = "Se Requiere un Documento";
                }

                Map<String, String> fcmData = new HashMap<>();
                fcmData.put("tramiteId", tramite.getId() != null ? tramite.getId() : "");
                fcmData.put("type", tipo != null ? tipo : "");
                fcmData.put("mensaje", mensaje != null ? mensaje : "");
                if (documentosRequeridos != null) {
                    fcmData.put("documentosRequeridos", String.join(",", documentosRequeridos));
                }
                if (actividadNombre != null) {
                    fcmData.put("actividadNombre", actividadNombre);
                }

                for (Usuario user : usuarios) {
                    if (user.getFcmToken() != null && !user.getFcmToken().trim().isEmpty()) {
                        firebaseMessagingService.enviarNotificacionPush(
                                user.getFcmToken(),
                                title,
                                mensaje,
                                fcmData
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error al procesar el envío de notificación push de documentos", e);
        }
    }
}

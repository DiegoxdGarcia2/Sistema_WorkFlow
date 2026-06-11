package com.bpm.inteligente.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
public class FirebaseMessagingService {

    public void enviarNotificacionPush(String fcmToken, String title, String body, Map<String, String> data) {
        if (FirebaseApp.getApps().isEmpty()) {
            log.warn("⚠️ Se intentó enviar notificación push pero Firebase Admin SDK no está inicializado (archivo credenciales faltante).");
            return;
        }

        if (fcmToken == null || fcmToken.trim().isEmpty()) {
            log.warn("⚠️ Token FCM nulo o vacío, omitiendo envío push.");
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putAllData(data)
                    .build();

            log.info("Enviando notificación push FCM a token: {}", fcmToken);
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Notificación push FCM enviada exitosamente. ID de respuesta: {}", response);
        } catch (Exception e) {
            log.error("❌ Fallo al enviar notificación push FCM", e);
        }
    }
}

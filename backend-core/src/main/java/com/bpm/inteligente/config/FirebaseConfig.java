package com.bpm.inteligente.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;

@Slf4j
@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            ClassPathResource resource = new ClassPathResource("firebase-service-account.json");
            if (!resource.exists()) {
                log.warn(
                        "⚠️ Archivo 'firebase-service-account.json' no encontrado en resources. Las notificaciones push (FCM) estarán desactivadas.");
                return;
            }

            try (InputStream serviceAccountStream = resource.getInputStream()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                        .build();

                if (FirebaseApp.getApps().isEmpty()) {
                    FirebaseApp.initializeApp(options);
                    log.info("🔥 Firebase Admin SDK inicializado exitosamente.");
                } else {
                    log.info("🔥 Firebase Admin SDK ya estaba inicializado.");
                }
            }
        } catch (Exception e) {
            log.error("❌ Error al inicializar Firebase Admin SDK. Las notificaciones push estarán desactivadas.", e);
        }
    }
}

package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.enums.EstadoTramite;
import com.bpm.inteligente.dto.ChatbotRequestDTO;
import com.bpm.inteligente.dto.ChatbotResponseDTO;
import com.bpm.inteligente.repository.PoliticaNegocioRepository;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import com.bpm.inteligente.repository.TramiteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.*;

/**
 * Servicio de Chatbot conversacional.
 * 
 * ARQUITECTURA (Fase 1 — Desacoplamiento):
 * - El CONTEXTO DINÁMICO (datos del sistema) se genera AQUÍ en Java
 *   porque requiere acceso directo a los repositorios MongoDB.
 * - La LÓGICA DE IA (prompt engineering, LLM) se delega al microservicio Python.
 * - En la Fase 2 (RAG), Python accederá directamente a la BD.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final ObjectMapper objectMapper;
    private final TramiteRepository tramiteRepo;
    private final RegistroActividadRepository registroRepo;
    private final PoliticaNegocioRepository politicaRepo;

    /** URL base del microservicio Python */
    @Value("${ai.microservice.url:http://localhost:8000}")
    private String aiMicroserviceUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final WebClient.Builder webClientBuilder;

    /**
     * Genera un snapshot dinámico del estado actual del sistema.
     * Se inyecta como contexto adicional en el payload hacia Python.
     */
    private String generarContextoDinamico() {
        try {
            long tramitesActivos = tramiteRepo.countByEstado(EstadoTramite.EN_PROGRESO);
            long tareasPendientes = registroRepo.countByEstado(com.bpm.inteligente.domain.enums.EstadoRegistro.PENDIENTE);
            long tareasEnProgreso = registroRepo.countByEstado(com.bpm.inteligente.domain.enums.EstadoRegistro.EN_PROGRESO);
            long politicasActivas = politicaRepo.countByEstaActivaTrue();

            return String.format(
                "ESTADO ACTUAL DEL SISTEMA (datos reales en tiempo real):\n" +
                "- Trámites activos (EN_PROGRESO): %d\n" +
                "- Tareas pendientes de asignar: %d\n" +
                "- Tareas en progreso (asignadas): %d\n" +
                "- Políticas de negocio activas: %d\n",
                tramitesActivos, tareasPendientes, tareasEnProgreso, politicasActivas
            );
        } catch (Exception e) {
            log.warn("No se pudo generar contexto dinámico para chatbot: {}", e.getMessage());
            return "(No se pudo obtener el estado actual del sistema)";
        }
    }

    /**
     * Consulta al chatbot delegando al microservicio Python.
     * Incluye el contexto dinámico del sistema como parte del payload.
     * (Versión Síncrona - Fallback)
     */
    public ChatbotResponseDTO consultar(ChatbotRequestDTO request) {
        try {
            // ── Generar contexto dinámico (acceso a MongoDB) ─────────
            String contextoDinamico = generarContextoDinamico();

            // ── Delegar al microservicio Python ─────────────────────
            String url = aiMicroserviceUrl + "/api/ai/chatbot/chat";
            log.info("Delegando consulta de chatbot al microservicio Python: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Payload enriquecido con contexto del sistema
            Map<String, Object> payload = new HashMap<>();
            payload.put("mensaje", request.getMensaje());
            payload.put("contextoSeccion", request.getContextoSeccion());
            payload.put("contextoDinamico", contextoDinamico);
            if (request.getHistorial() != null) {
                payload.put("historial", request.getHistorial());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<ChatbotResponseDTO> response = restTemplate.postForEntity(url, entity, ChatbotResponseDTO.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Respuesta exitosa del chatbot Python");
                return response.getBody();
            }

            log.warn("Microservicio Python respondió con status {}", response.getStatusCode());
            return new ChatbotResponseDTO(
                "No pude contactar con el cerebro de IA. Intenta de nuevo en unos segundos.",
                null
            );

        } catch (Exception e) {
            log.error("Error al contactar microservicio Python para chatbot: {}", e.getMessage());
            return new ChatbotResponseDTO(
                "El servicio de IA no está disponible en este momento. " +
                "Por favor verifica que el microservicio Python esté corriendo en " + aiMicroserviceUrl,
                null
            );
        }
    }

    /**
     * Consulta al chatbot usando SSE (Server-Sent Events) para respuestas en streaming.
     */
    public SseEmitter consultarStream(ChatbotRequestDTO request) {
        // Timeout de 60 segundos para evitar que la conexión cuelgue
        SseEmitter emitter = new SseEmitter(60000L);

        try {
            String contextoDinamico = generarContextoDinamico();
            String url = aiMicroserviceUrl + "/api/ai/chatbot/chat";
            log.info("Iniciando stream de chatbot con microservicio Python: {}", url);

            Map<String, Object> payload = new HashMap<>();
            payload.put("mensaje", request.getMensaje());
            payload.put("contextoSeccion", request.getContextoSeccion());
            payload.put("contextoDinamico", contextoDinamico);
            if (request.getHistorial() != null) {
                payload.put("historial", request.getHistorial());
            }

            WebClient webClient = webClientBuilder.build();

            Flux<String> stream = webClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToFlux(String.class);

            stream.subscribe(
                chunk -> {
                    try {
                        // Spring WebFlux decodifica los eventos SSE automáticamente y nos da la cadena de 'data:'
                        // Nosotros lo re-envolvemos en un evento SSE de SseEmitter
                        emitter.send(SseEmitter.event().data(chunk));
                    } catch (IOException e) {
                        log.error("Error emitiendo chunk al cliente: {}", e.getMessage());
                        emitter.completeWithError(e);
                    }
                },
                error -> {
                    log.error("Error leyendo stream de Python: {}", error.getMessage());
                    emitter.completeWithError(error);
                },
                () -> {
                    log.info("Stream completado exitosamente");
                    emitter.complete();
                }
            );

        } catch (Exception e) {
            log.error("Error al inicializar el stream de chatbot: {}", e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }
}

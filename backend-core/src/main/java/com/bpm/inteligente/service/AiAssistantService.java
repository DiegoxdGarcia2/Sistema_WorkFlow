package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.AiActionDTO;
import com.bpm.inteligente.dto.AiCommandDTO;
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

import java.util.*;

/**
 * Servicio de Asistente IA para el Diseñador BPM.
 * 
 * ARQUITECTURA (Fase 1 — Desacoplamiento):
 * Este servicio actúa como PROXY/GATEWAY hacia el microservicio Python (FastAPI).
 * - La lógica de IA (prompts, LLM, parsing) se procesa en Python.
 * - Spring Boot delega la petición y retorna la respuesta al frontend.
 * - Se mantiene un FALLBACK LOCAL (RegEx) como safety net si Python no responde.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private final ObjectMapper objectMapper;

    /** URL base del microservicio Python (configurable vía application.yml) */
    @Value("${ai.microservice.url:http://localhost:8000}")
    private String aiMicroserviceUrl;

    /** Timeout para la conexión al microservicio (ms) */
    @Value("${ai.microservice.timeout:30000}")
    private int aiTimeout;

    /** Secreto para autenticación inter-servicios */
    @Value("${ai.microservice.secret:dev_secret_local_only}")
    private String aiApiSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Ejecuta un comando de IA delegando al microservicio Python.
     * Si el microservicio no responde, usa el fallback local basado en RegEx.
     */
    public AiActionDTO ejecutarComando(AiCommandDTO request) {
        try {
            // ── Delegar al microservicio Python ──────────────────────
            String url = aiMicroserviceUrl + "/api/ai/assistant/prompt";
            log.info("Delegando comando IA al microservicio Python: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-Secret", aiApiSecret);

            // Construir payload compatible con el modelo Pydantic de Python
            Map<String, Object> payload = new HashMap<>();
            payload.put("instruccion", request.getInstruccion());
            payload.put("politicaId", request.getPoliticaId());
            if (request.getContexto() != null) {
                payload.put("contexto", objectMapper.convertValue(request.getContexto(), Map.class));
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<AiActionDTO> response = restTemplate.postForEntity(url, entity, AiActionDTO.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Respuesta exitosa del microservicio Python");
                return response.getBody();
            }

            log.warn("Microservicio Python respondió con status {}, usando fallback local", response.getStatusCode());
            return fallbackLocal(request);

        } catch (Exception e) {
            // Si el microservicio Python no está disponible, usamos el fallback local
            log.warn("Microservicio Python no disponible ({}), usando fallback local RegEx", e.getMessage());
            return fallbackLocal(request);
        }
    }

    /**
     * FALLBACK LOCAL — Safety net basado en RegEx.
     * Se activa cuando el microservicio Python no responde.
     * Requerido por especificación para garantizar disponibilidad mínima.
     */
    private AiActionDTO fallbackLocal(AiCommandDTO req) {
        log.info("Usando Fallback Local basado en RegEx para la instrucción: {}", req.getInstruccion());
        AiActionDTO result = new AiActionDTO();
        result.setExplicacion("Modo sin conexión. Usando procesamiento básico.");
        List<AiActionDTO.AiAction> acciones = new ArrayList<>();

        String i = req.getInstruccion().toLowerCase();
        
        if (i.contains("crea") || i.contains("agrega")) {
            if (i.contains("calle")) {
                AiActionDTO.AiAction a = new AiActionDTO.AiAction();
                a.setTipo("CREAR_CALLE");
                a.setParams(Map.of("nombre", "Nueva Calle (Auto)"));
                acciones.add(a);
            } else if (i.contains("tarea") || i.contains("actividad")) {
                AiActionDTO.AiAction a = new AiActionDTO.AiAction();
                a.setTipo("CREAR_NODO");
                a.setParams(Map.of("tipo", "TAREA", "nombre", "Tarea Automática"));
                acciones.add(a);
            } else if (i.contains("inicio")) {
                AiActionDTO.AiAction a = new AiActionDTO.AiAction();
                a.setTipo("CREAR_NODO");
                a.setParams(Map.of("tipo", "INICIO", "nombre", "Inicio"));
                acciones.add(a);
            } else if (i.contains("fin")) {
                AiActionDTO.AiAction a = new AiActionDTO.AiAction();
                a.setTipo("CREAR_NODO");
                a.setParams(Map.of("tipo", "FIN", "nombre", "Fin"));
                acciones.add(a);
            }
        }
        
        if (acciones.isEmpty()) {
            result.setExplicacion("No entendí la instrucción o no está soportada en el modo local.");
            AiActionDTO.AiAction a = new AiActionDTO.AiAction();
            a.setTipo("NOT_SUPPORTED");
            a.setParams(Map.of("razon", "Acción no soportada en el diseñador local."));
            acciones.add(a);
        }
        
        result.setAcciones(acciones);
        return result;
    }
}

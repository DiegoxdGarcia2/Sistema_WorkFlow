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

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAssistantService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    public AiActionDTO ejecutarComando(AiCommandDTO request) {
        try {
            // Si no hay API key o hay error, intentamos un fallback local
            if (groqApiKey == null || groqApiKey.isEmpty()) {
                return fallbackLocal(request);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            String contextJson = objectMapper.writeValueAsString(request.getContexto());

            String systemPrompt = "Eres un asistente IA experto en modelado BPMN que controla un lienzo visual. " +
                    "El usuario te da instrucciones en lenguaje natural. DEBES devolver UNICAMENTE un JSON válido con la siguiente estructura y NINGUN OTRO TEXTO:\n" +
                    "{\n" +
                    "  \"explicacion\": \"Breve mensaje para el usuario de lo que vas a hacer\",\n" +
                    "  \"acciones\": [\n" +
                    "     { \"tipo\": \"CREAR_CALLE\", \"params\": { \"nombre\": \"Ventas\", \"color\": \"#6366f1\" } },\n" +
                    "     { \"tipo\": \"CREAR_NODO\", \"params\": { \"tipo\": \"TAREA\", \"nombre\": \"Revisar Solicitud\", \"calleNombre\": \"Ventas\" } }\n" +
                    "  ]\n" +
                    "}\n\n" +
                    "Acciones posibles: CREAR_CALLE, CREAR_NODO, ELIMINAR_NODO, CONECTAR_NODOS, MODIFICAR_NODO, ELIMINAR_CALLE, MOVER_NODO, EDITAR_TRANSICION, REORDENAR_CALLES, CAMBIAR_ESTILO, MOVER_NODO_COORDENADAS.\n" +
                    "Para CAMBIAR_ESTILO los params son: nombre (string del nodo o calle), color (hex string), ancho (number), alto (number), fontSize (sm, md, lg).\n" +
                    "Para MOVER_NODO_COORDENADAS los params son: nombreNodo (string), x (number), y (number).\n" +
                    "Para REORDENAR_CALLES los params son: nombresOrdenados (array de strings).\n" +
                    "Tipos de nodo válidos: INICIO, FIN, TAREA, DECISION, FORK, JOIN.\n" +
                    "REGLA CRITICA: Usa colores profesionales (pastel, slate, indigo). Si el usuario pide mover un nodo a una posicion especifica usa MOVER_NODO_COORDENADAS.\n" +
                    "El contexto actual del diagrama es:\n" + contextJson;

            Map<String, Object> messageSystem = new HashMap<>();
            messageSystem.put("role", "system");
            messageSystem.put("content", systemPrompt);

            Map<String, Object> messageUser = new HashMap<>();
            messageUser.put("role", "user");
            messageUser.put("content", request.getInstruccion());

            Map<String, Object> body = new HashMap<>();
            body.put("model", "llama-3.3-70b-versatile");
            body.put("messages", Arrays.asList(messageSystem, messageUser));
            body.put("temperature", 0.1);
            body.put("response_format", Map.of("type", "json_object"));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_API_URL, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    
                    return objectMapper.readValue(content, AiActionDTO.class);
                }
            }
            
            return fallbackLocal(request);

        } catch (Exception e) {
            log.error("Error al llamar a Groq API: ", e);
            return fallbackLocal(request); // RegEx Fallback si el LLM falla (Requerido por PDF)
        }
    }

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
            result.setExplicacion("No entendí la instrucción en el modo local.");
        }
        
        result.setAcciones(acciones);
        return result;
    }
}

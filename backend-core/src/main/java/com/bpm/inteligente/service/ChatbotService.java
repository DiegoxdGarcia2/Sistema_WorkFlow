package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.ChatbotRequestDTO;
import com.bpm.inteligente.dto.ChatbotResponseDTO;
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
public class ChatbotService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper;
    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    public ChatbotResponseDTO consultar(ChatbotRequestDTO request) {
        try {
            if (groqApiKey == null || groqApiKey.isEmpty()) {
                return new ChatbotResponseDTO("Modo sin conexión: Para poder ayudarte dinámicamente, por favor configura la GROQ_API_KEY en el servidor.", null);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            Map<String, String> messageSystem = new HashMap<>();
            messageSystem.put("role", "system");
            messageSystem.put("content", "Eres BPM-Guía, el asistente experto y navegador del sistema BPM Inteligente. " +
                    "Tu objetivo es ayudar al usuario y, si es posible, LLEVARLO al lugar correcto del sistema.\n\n" +
                    "REGLAS DE RESPUESTA:\n" +
                    "1. Responde SIEMPRE en formato JSON con dos campos: 'respuesta' (texto corto y claro en Markdown) y 'rutaNavegacion' (string con la ruta o null).\n" +
                    "2. Sé conciso. No escribas manuales largos. Si puedes navegar al usuario, hazlo y da una instrucción breve de 2-3 pasos.\n" +
                    "3. RUTAS DISPONIBLES (Úsalas exactamente así):\n" +
                    "   - '/admin?tab=monitor': Monitor de procesos y cuellos de botella.\n" +
                    "   - '/admin?tab=usuarios': Gestión de Colaboradores/Usuarios.\n" +
                    "   - '/admin?tab=departamentos': Estructura de Departamentos.\n" +
                    "   - '/admin?tab=cargos': Gestión de Cargos institucionales.\n" +
                    "   - '/admin?tab=tenants': Datos de la Empresa/Tenant.\n" +
                    "   - '/admin?tab=audit': Auditoría del sistema.\n" +
                    "   - '/admin?tab=formularios': Repositorio de Formularios.\n" +
                    "   - '/designer': Hub de Proyectos y nuevas políticas.\n" +
                    "   - '/designer/editor': Editor gráfico de flujos.\n" +
                    "   - '/admin?tab=monitor': Monitor de procesos global y cuellos de botella (Historial de Procesos).\n" +
                    "   - '/funcionario?tab=bandeja': Bandeja de tareas pendientes del usuario.\n" +
                    "   - '/funcionario?tab=disponible': Tareas disponibles para tomar.\n" +
                    "   - '/funcionario?tab=historial': Mi Historial personal de tareas realizadas.\n" +
                    "   - '/funcionario?tab=iniciar': Iniciar un nuevo trámite.\n" +
                    "   - '/tracking': Seguimiento de trámites.\n\n" +
                    "3. DETALLES DE LA INTERFAZ (Instrucciones precisas):\n" +
                    "   - Pestaña 'Usuarios': Botón '+ Nuevo Usuario'.\n" +
                    "   - Pestaña 'Empresa': Botón 'Editar Perfil Institucional'.\n" +
                    "   - Pestaña 'Departamentos': Botón '+ Nuevo Departamento'.\n" +
                    "   - Pestaña 'Cargos': Botón '+ Nuevo Cargo'.\n" +
                    "   - Pestaña 'Formularios': Botón '+ Crear Formulario'.\n" +
                    "   - Designer Hub: Botón '+ Nuevo Proyecto'.\n" +
                    "   - Funcionario: Botones 'Tomar Tarea', 'Completar Tarea', 'Iniciar Nuevo Proceso' (en pestaña Iniciar).\n\n" +
                    "REGLAS DE ORO:\n" +
                    "1. Responde SIEMPRE en formato JSON con 'respuesta' y 'rutaNavegacion'.\n" +
                    "2. Sé descriptivo: Primero menciona a dónde llevaste al usuario y luego qué botón específico debe presionar.\n" +
                    "3. No uses términos genéricos. Usa los nombres de los botones mencionados arriba.\n\n" +
                    "EJEMPLO:\n" +
                    "Si el usuario dice 'ayúdame a crear un usuario', responde:\n" +
                    "{\n" +
                    "  \"respuesta\": \"Te he llevado al Panel de Administración. Haz clic en la pestaña **Usuarios** y luego en **Crear Usuario**.\",\n" +
                    "  \"rutaNavegacion\": \"/admin\"\n" +
                    "}");

            Map<String, String> messageUser = new HashMap<>();
            messageUser.put("role", "user");
            messageUser.put("content", request.getMensaje() + "\n(Contexto actual: " + request.getContextoSeccion() + ")");

            Map<String, Object> body = new HashMap<>();
            body.put("model", "llama-3.3-70b-versatile");
            body.put("messages", Arrays.asList(messageSystem, messageUser));
            body.put("temperature", 0.3);
            body.put("response_format", Map.of("type", "json_object"));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            log.info("Enviando petición a Groq para Chatbot...");
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_API_URL, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Respuesta de Groq recibida. Status: {}", response.getStatusCode());
                Map responseBody = response.getBody();
                List<Map> choices = (List<Map>) responseBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    String jsonText = (String) ((Map) choices.get(0).get("message")).get("content");
                    log.debug("JSON de IA: {}", jsonText);
                    
                    Map<String, String> aiResult = objectMapper.readValue(jsonText, Map.class);
                    
                    return new ChatbotResponseDTO(
                            aiResult.getOrDefault("respuesta", "Lo siento, no pude procesar la respuesta."),
                            aiResult.get("rutaNavegacion")
                    );
                }
            }

            return new ChatbotResponseDTO("No pude contactar con el cerebro de IA.", null);

        } catch (Exception e) {
            log.error("ERROR CRÍTICO en ChatbotService: ", e);
            return new ChatbotResponseDTO("No pude contactar con el cerebro de IA. Error: " + e.getMessage(), null);
        }
    }
}

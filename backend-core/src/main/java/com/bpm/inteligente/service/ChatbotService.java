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

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    private final ObjectMapper objectMapper;
    private final TramiteRepository tramiteRepo;
    private final RegistroActividadRepository registroRepo;
    private final PoliticaNegocioRepository politicaRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    /**
     * Genera un snapshot dinámico del estado actual del sistema para inyectarlo
     * en el system prompt del LLM, dándole contexto real.
     */
    private String generarContextoDinamico() {
        try {
            long tramitesActivos = tramiteRepo.countByEstado(EstadoTramite.EN_PROGRESO);
            long tareasPendientes = registroRepo.countByEstado(com.bpm.inteligente.domain.enums.EstadoRegistro.PENDIENTE);
            long tareasEnProgreso = registroRepo.countByEstado(com.bpm.inteligente.domain.enums.EstadoRegistro.EN_PROGRESO);
            long politicasActivas = politicaRepo.countByEstaActivaTrue();

            return String.format(
                "\n\nESTADO ACTUAL DEL SISTEMA (datos reales en tiempo real):\n" +
                "- Trámites activos (EN_PROGRESO): %d\n" +
                "- Tareas pendientes de asignar: %d\n" +
                "- Tareas en progreso (asignadas): %d\n" +
                "- Políticas de negocio activas: %d\n",
                tramitesActivos, tareasPendientes, tareasEnProgreso, politicasActivas
            );
        } catch (Exception e) {
            log.warn("No se pudo generar contexto dinámico para chatbot: {}", e.getMessage());
            return "\n\n(No se pudo obtener el estado actual del sistema)\n";
        }
    }

    public ChatbotResponseDTO consultar(ChatbotRequestDTO request) {
        try {
            if (groqApiKey == null || groqApiKey.isEmpty()) {
                return new ChatbotResponseDTO("Modo sin conexión: Para poder ayudarte dinámicamente, por favor configura la GROQ_API_KEY en el servidor.", null);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            String contextoDinamico = generarContextoDinamico();

            Map<String, String> messageSystem = new HashMap<>();
            messageSystem.put("role", "system");
            messageSystem.put("content", "Eres BPM-Guía, el asistente experto y navegador del sistema BPM Inteligente. " +
                    "Tu objetivo es ayudar al usuario y, si es posible, LLEVARLO al lugar correcto del sistema.\n\n" +
                    "REGLAS DE RESPUESTA:\n" +
                    "1. Responde SIEMPRE en formato JSON con dos campos: 'respuesta' (texto corto y claro en Markdown) y 'rutaNavegacion' (string con la ruta o null).\n" +
                    "2. Sé conciso pero específico. Usa los datos reales del sistema cuando estén disponibles para dar respuestas personalizadas.\n" +
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
                    "   - '/funcionario?tab=bandeja': Bandeja de tareas pendientes del usuario.\n" +
                    "   - '/funcionario?tab=disponible': Mercado de tareas disponibles para tomar.\n" +
                    "   - '/funcionario?tab=historial': Mi Historial personal de tareas realizadas.\n" +
                    "   - '/funcionario?tab=iniciar': Iniciar un nuevo trámite.\n" +
                    "   - '/tracking': Seguimiento de trámites.\n\n" +
                    "4. DETALLES DE LA INTERFAZ (Instrucciones precisas):\n" +
                    "   - Pestaña 'Usuarios': Botón '+ Nuevo Usuario'.\n" +
                    "   - Pestaña 'Empresa': Botón 'Editar Perfil Institucional'.\n" +
                    "   - Pestaña 'Departamentos': Botón '+ Nuevo Departamento'.\n" +
                    "   - Pestaña 'Cargos': Botón '+ Nuevo Cargo'.\n" +
                    "   - Pestaña 'Formularios': Botón '+ Crear Formulario'.\n" +
                    "   - Designer Hub: Botón '+ Nuevo Proyecto'.\n" +
                    "   - Funcionario: Botones 'Tomar Tarea', 'Completar Tarea', 'Iniciar Nuevo Proceso' (en pestaña Iniciar).\n\n" +
                    "REGLAS DE ORO:\n" +
                    "1. Sé descriptivo y específico: Di EXACTAMENTE qué botón presionar y dónde.\n" +
                    "2. Usa los datos del sistema para personalizar la respuesta (ej: 'Tienes 3 trámites activos').\n" +
                    "3. Si el usuario pregunta algo sobre el estado del sistema, usa los datos reales proporcionados.\n" +
                    "4. NO repitas la misma respuesta genérica. Adapta según el contexto.\n\n" +
                    contextoDinamico);

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

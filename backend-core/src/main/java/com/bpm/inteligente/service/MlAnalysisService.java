package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Actividad;
import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.Transicion;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.dto.AnalysisResultDTO;
import com.bpm.inteligente.dto.InsightsResultDTO;
import com.bpm.inteligente.dto.PoliticaDTO;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import org.springframework.web.util.UriComponentsBuilder;
import com.bpm.inteligente.config.TenantContext;
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

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Servicio de Análisis ML y Simulación de Procesos BPM.
 * 
 * ARQUITECTURA (Fase 1 — Desacoplamiento):
 * - analyze(PoliticaDTO)       → SE QUEDA EN JAVA (análisis estático de grafos, no requiere ML)
 * - analyzeRealData(politicaId) → SE DELEGA A PYTHON (análisis de datos históricos, futuro Scikit-learn)
 * - simulate(PoliticaDTO, n)    → SE QUEDA EN JAVA (simulación Monte Carlo, no requiere ML)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MlAnalysisService {

    private final RegistroActividadRepository registroRepo;
    private final ObjectMapper objectMapper;

    /** URL base del microservicio Python */
    @Value("${ai.microservice.url:http://localhost:8000}")
    private String aiMicroserviceUrl;

    /** Secreto para autenticación inter-servicios */
    @Value("${ai.microservice.secret:dev_secret_local_only}")
    private String aiApiSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Análisis basado en datos REALES de ejecución histórica.
     * DELEGADO AL MICROSERVICIO PYTHON (Fase 3).
     * Ya no envía todos los registros, solo envía el politicaId para que Python lea de DB.
     */
    public AnalysisResultDTO analyzeRealData(String politicaId) {
        try {
            String url = aiMicroserviceUrl + "/api/ai/analyze-bottlenecks";
            log.info("Delegando análisis ML al microservicio Python: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-API-Secret", aiApiSecret);

            Map<String, Object> payload = new HashMap<>();
            payload.put("politicaId", politicaId);
            payload.put("registrosCompletados", new ArrayList<>()); // Vacío, Python lee directo de MongoDB
            payload.put("tenantId", TenantContext.getCurrentTenant());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<AnalysisResultDTO> response = restTemplate.postForEntity(url, entity, AnalysisResultDTO.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Respuesta exitosa del análisis ML Python");
                return response.getBody();
            }

            log.warn("Microservicio Python respondió con status {}, usando fallback Java", response.getStatusCode());
            return analyzeRealDataFallback(null);

        } catch (Exception e) {
            log.warn("Microservicio Python no disponible para ML ({}), usando fallback Java", e.getMessage());
            return analyzeRealDataFallback(null);
        }
    }

    /**
     * Obtiene insights completos generados por ML y Groq.
     * Llama al nuevo endpoint de Fase 3 en Python.
     */
    public InsightsResultDTO obtenerInsights(String politicaId) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(aiMicroserviceUrl + "/api/ai/insights");
            if (politicaId != null && !politicaId.isEmpty() && !politicaId.equals("null")) {
                builder.queryParam("politicaId", politicaId);
            }
            String tid = TenantContext.getCurrentTenant();
            if (tid != null && !tid.isEmpty()) {
                builder.queryParam("tenantId", tid);
            }
            
            String url = builder.toUriString();
            log.info("Obteniendo Insights ML desde Python: {}", url);

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-API-Secret", aiApiSecret);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<InsightsResultDTO> response = restTemplate.exchange(
                url, 
                org.springframework.http.HttpMethod.GET, 
                entity, 
                InsightsResultDTO.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            
            throw new RuntimeException("Error del servidor Python: " + response.getStatusCode());
            
        } catch (Exception e) {
            log.error("No se pudieron obtener insights: {}", e.getMessage());
            // Retorna un objeto vacío con mensaje de error
            return InsightsResultDTO.builder()
                .politicaId(politicaId)
                .insightsNaturales("Error al contactar el motor de ML: " + e.getMessage())
                .build();
        }
    }

    /**
     * Fallback local para análisis de datos reales.
     * Usa la lógica original de Java cuando Python no está disponible.
     */
    private AnalysisResultDTO analyzeRealDataFallback(List<RegistroActividad> completados) {
        List<AnalysisResultDTO.Finding> findings = new ArrayList<>();

        if (completados == null) {
            completados = registroRepo.findAll().stream()
                    .filter(r -> r.getEstado() == EstadoRegistro.HECHO
                            && r.getAsignadoEn() != null
                            && r.getCompletadoEn() != null)
                    .collect(Collectors.toList());
        }

        if (completados.isEmpty()) {
            findings.add(AnalysisResultDTO.Finding.builder()
                    .type("INFO").severity("INFO").nodeId("")
                    .message("No hay suficientes datos históricos para análisis. Complete más tareas para obtener insights.")
                    .suggestion("Ejecute al menos 5 trámites completos para obtener estadísticas significativas.")
                    .build());
            return AnalysisResultDTO.builder().findings(findings).build();
        }

        // Agrupar por actividad y calcular tiempos promedio en minutos
        Map<String, List<Long>> tiemposPorActividad = new HashMap<>();
        for (RegistroActividad r : completados) {
            long duracionMinutos = Duration.between(r.getAsignadoEn(), r.getCompletadoEn()).toMinutes();
            if (duracionMinutos < 0) duracionMinutos = 0;
            tiemposPorActividad.computeIfAbsent(r.getActividadId(), k -> new ArrayList<>()).add(duracionMinutos);
        }

        double promedioGlobal = completados.stream()
                .mapToLong(r -> Duration.between(r.getAsignadoEn(), r.getCompletadoEn()).toMinutes())
                .average().orElse(0);

        for (Map.Entry<String, List<Long>> entry : tiemposPorActividad.entrySet()) {
            double promedio = entry.getValue().stream().mapToLong(Long::longValue).average().orElse(0);
            int count = entry.getValue().size();

            if (promedio > promedioGlobal * 2 && count >= 2) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("BOTTLENECK_REAL").severity("CRITICAL").nodeId(entry.getKey())
                        .message(String.format("Cuello de botella: Actividad '%s' toma %.0f min en promedio (%.0f min global, %d ejecuciones).",
                                entry.getKey(), promedio, promedioGlobal, count))
                        .suggestion("Considere dividir esta tarea, asignar más personal, o automatizar pasos repetitivos.")
                        .build());
            } else if (promedio > promedioGlobal * 1.5 && count >= 2) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("SLOW_ACTIVITY").severity("WARNING").nodeId(entry.getKey())
                        .message(String.format("Actividad '%s' más lenta que el promedio: %.0f min vs %.0f min global (%d ejecuciones).",
                                entry.getKey(), promedio, promedioGlobal, count))
                        .suggestion("Revise si hay pasos innecesarios o formularios demasiado complejos.")
                        .build());
            }
        }

        if (findings.isEmpty()) {
            findings.add(AnalysisResultDTO.Finding.builder()
                    .type("OK").severity("INFO").nodeId("")
                    .message(String.format("Proceso opera dentro de parámetros normales. Promedio: %.0f min/tarea (%d tareas).", promedioGlobal, completados.size()))
                    .suggestion("Continúe monitoreando. Los datos mejorarán con más ejecuciones.")
                    .build());
        }

        return AnalysisResultDTO.builder().findings(findings).build();
    }

    /**
     * Análisis ESTRUCTURAL del grafo BPM.
     * SE QUEDA EN JAVA — No requiere ML, es lógica pura de grafos.
     */
    public AnalysisResultDTO analyze(PoliticaDTO politica) {
        List<AnalysisResultDTO.Finding> findings = new ArrayList<>();

        if (politica == null || politica.getCalles() == null || politica.getTransiciones() == null) {
            return AnalysisResultDTO.builder().findings(findings).build();
        }

        Map<String, Actividad> nodeMap = new HashMap<>();
        politica.getCalles().forEach(c -> c.getActividades().forEach(a -> nodeMap.put(a.getId(), a)));

        Map<String, List<String>> adjList = new HashMap<>();
        Map<String, List<String>> reverseAdjList = new HashMap<>();
        Map<String, Integer> inDegree = new HashMap<>();
        Map<String, Integer> outDegree = new HashMap<>();

        nodeMap.keySet().forEach(id -> {
            adjList.put(id, new ArrayList<>());
            reverseAdjList.put(id, new ArrayList<>());
            inDegree.put(id, 0);
            outDegree.put(id, 0);
        });

        for (Transicion t : politica.getTransiciones()) {
            if (nodeMap.containsKey(t.getOrigenId()) && nodeMap.containsKey(t.getDestinoId())) {
                adjList.get(t.getOrigenId()).add(t.getDestinoId());
                reverseAdjList.get(t.getDestinoId()).add(t.getOrigenId());
                outDegree.put(t.getOrigenId(), outDegree.get(t.getOrigenId()) + 1);
                inDegree.put(t.getDestinoId(), inDegree.get(t.getDestinoId()) + 1);
            }
        }

        // 1. Detectar Nodos Huérfanos
        nodeMap.forEach((id, act) -> {
            if (inDegree.get(id) == 0 && outDegree.get(id) == 0) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("ORPHAN").severity("WARNING").nodeId(id)
                        .message("El nodo '" + act.getNombre() + "' no está conectado a nada.")
                        .suggestion("Conecta este nodo al flujo o elimínalo si ya no es necesario.")
                        .build());
            }
        });

        // 2. Detectar Dead-ends
        nodeMap.forEach((id, act) -> {
            if (outDegree.get(id) == 0 && !act.isEsFinal() && inDegree.get(id) > 0) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("DEAD_END").severity("CRITICAL").nodeId(id)
                        .message("El nodo '" + act.getNombre() + "' recibe flujo pero no tiene salidas ni está marcado como Fin.")
                        .suggestion("Añade una conexión de salida o marca el nodo como Punto de Finalización.")
                        .build());
            }
        });

        // 3. Detectar Nodos Iniciales sin salidas
        nodeMap.forEach((id, act) -> {
            if (act.isEsInicial() && outDegree.get(id) == 0) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("INVALID_BPMN").severity("CRITICAL").nodeId(id)
                        .message("El nodo de inicio '" + act.getNombre() + "' no tiene conexiones de salida.")
                        .suggestion("El flujo debe empezar conectando el nodo inicial a la primera actividad.")
                        .build());
            }
        });

        // 4. Detectar Caminos Inalcanzables
        nodeMap.forEach((id, act) -> {
            if (!act.isEsInicial() && inDegree.get(id) == 0 && outDegree.get(id) > 0) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("UNREACHABLE").severity("WARNING").nodeId(id)
                        .message("El nodo '" + act.getNombre() + "' tiene salidas pero no recibe entradas.")
                        .suggestion("Conecta un nodo previo a esta actividad o márcala como Inicio.")
                        .build());
            }
        });

        // 5. Detectar Cuellos de Botella Estructurales
        nodeMap.forEach((id, act) -> {
            if (inDegree.get(id) >= 3 && !act.getTipo().name().equals("JOIN")) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("BOTTLENECK").severity("WARNING").nodeId(id)
                        .message("La actividad '" + act.getNombre() + "' recibe 3 o más flujos, lo que puede causar embotellamientos.")
                        .suggestion("Considera dividir la tarea, delegar a otra calle o utilizar una compuerta de sincronización (Join).")
                        .build());
            }
        });

        // 6. Detectar Ciclos Infinitos
        Set<String> visited = new HashSet<>();
        Set<String> recursionStack = new HashSet<>();
        List<String> startNodes = nodeMap.values().stream()
                .filter(Actividad::isEsInicial)
                .map(Actividad::getId)
                .collect(Collectors.toList());

        for (String startNode : startNodes) {
            if (hasCycleAndDeadlock(startNode, adjList, visited, recursionStack, nodeMap)) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("INFINITE_LOOP").severity("CRITICAL").nodeId(startNode)
                        .message("Se detectó un posible bucle infinito o ciclo sin condición de salida clara.")
                        .suggestion("Revisa las compuertas de decisión en este camino para asegurar que haya una ruta hacia un fin.")
                        .build());
                break;
            }
        }

        return AnalysisResultDTO.builder().findings(findings).build();
    }

    private boolean hasCycleAndDeadlock(String current, Map<String, List<String>> adjList,
                                        Set<String> visited, Set<String> recursionStack, Map<String, Actividad> nodeMap) {
        if (recursionStack.contains(current)) return true;
        if (visited.contains(current)) return false;

        visited.add(current);
        recursionStack.add(current);

        for (String neighbor : adjList.get(current)) {
            if (hasCycleAndDeadlock(neighbor, adjList, visited, recursionStack, nodeMap)) return true;
        }

        recursionStack.remove(current);
        return false;
    }

    /**
     * Simulación Monte Carlo de ejecución de procesos.
     * SE QUEDA EN JAVA — No requiere ML, es simulación probabilística.
     */
    public AnalysisResultDTO.SimulationResult simulate(PoliticaDTO politica, int instances) {
        Map<String, Actividad> nodeMap = new HashMap<>();
        politica.getCalles().forEach(c -> c.getActividades().forEach(a -> nodeMap.put(a.getId(), a)));

        Map<String, List<String>> adjList = new HashMap<>();
        nodeMap.keySet().forEach(id -> adjList.put(id, new ArrayList<>()));
        for (Transicion t : politica.getTransiciones()) {
            if (nodeMap.containsKey(t.getOrigenId()) && nodeMap.containsKey(t.getDestinoId())) {
                adjList.get(t.getOrigenId()).add(t.getDestinoId());
            }
        }

        List<String> startNodes = nodeMap.values().stream()
                .filter(Actividad::isEsInicial)
                .map(Actividad::getId)
                .collect(Collectors.toList());

        if (startNodes.isEmpty()) {
            return AnalysisResultDTO.SimulationResult.builder().simulatedInstances(0).build();
        }

        Random rand = new Random();
        double totalTimeSum = 0;
        Map<String, Integer> visits = new HashMap<>();
        nodeMap.keySet().forEach(k -> visits.put(k, 0));
        int blocked = 0;

        for (int i = 0; i < instances; i++) {
            String curr = startNodes.get(rand.nextInt(startNodes.size()));
            double instanceTime = 0;
            int stepCount = 0;

            while (curr != null && stepCount < 1000) {
                visits.put(curr, visits.get(curr) + 1);
                Actividad a = nodeMap.get(curr);
                if (a.getTipo().name().startsWith("TAREA")) {
                    instanceTime += 5 + (rand.nextDouble() * 10);
                } else if (a.getTipo().name().equals("DECISION")) {
                    instanceTime += 1;
                }

                if (a.isEsFinal() || adjList.get(curr).isEmpty()) break;

                List<String> neighbors = adjList.get(curr);
                curr = neighbors.get(rand.nextInt(neighbors.size()));
                stepCount++;
            }

            if (stepCount >= 1000) blocked++;
            totalTimeSum += instanceTime;
        }

        Map<String, Double> avgNodeTime = new HashMap<>();
        nodeMap.keySet().forEach(k -> avgNodeTime.put(k, visits.get(k) > 0 ? 10.0 : 0.0));

        return AnalysisResultDTO.SimulationResult.builder()
                .simulatedInstances(instances)
                .averageTotalTimeMinutes(instances > 0 ? totalTimeSum / instances : 0)
                .bottleneckCounts(visits)
                .blockedInstances(blocked)
                .averageNodeTimeMinutes(avgNodeTime)
                .build();
    }
}

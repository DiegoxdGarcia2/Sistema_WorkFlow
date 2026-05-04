package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Actividad;
import com.bpm.inteligente.domain.RegistroActividad;
import com.bpm.inteligente.domain.Transicion;
import com.bpm.inteligente.domain.enums.EstadoRegistro;
import com.bpm.inteligente.dto.AnalysisResultDTO;
import com.bpm.inteligente.dto.PoliticaDTO;
import com.bpm.inteligente.repository.RegistroActividadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlAnalysisService {

    private final RegistroActividadRepository registroRepo;

    /**
     * Análisis basado en datos REALES de ejecución histórica.
     * Calcula tiempos promedio por actividad e identifica cuellos de botella.
     */
    public AnalysisResultDTO analyzeRealData(String politicaId) {
        List<AnalysisResultDTO.Finding> findings = new ArrayList<>();

        List<RegistroActividad> completados = registroRepo.findAll().stream()
                .filter(r -> r.getEstado() == EstadoRegistro.HECHO
                        && r.getAsignadoEn() != null
                        && r.getCompletadoEn() != null)
                .collect(Collectors.toList());

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

        // Calcular promedio global para detectar outliers
        double promedioGlobal = completados.stream()
                .mapToLong(r -> Duration.between(r.getAsignadoEn(), r.getCompletadoEn()).toMinutes())
                .average().orElse(0);

        // Detectar actividades lentas
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

        // Detectar desbalanceo de carga por departamento
        Map<String, Long> cargaPorDepto = completados.stream()
                .filter(r -> r.getDepartamentoId() != null)
                .collect(Collectors.groupingBy(RegistroActividad::getDepartamentoId, Collectors.counting()));

        if (cargaPorDepto.size() > 1) {
            long max = cargaPorDepto.values().stream().mapToLong(Long::longValue).max().orElse(0);
            long min = cargaPorDepto.values().stream().mapToLong(Long::longValue).min().orElse(0);
            if (max > min * 3 && min > 0) {
                findings.add(AnalysisResultDTO.Finding.builder()
                        .type("LOAD_IMBALANCE").severity("WARNING").nodeId("")
                        .message(String.format("Desbalanceo de carga: el departamento más cargado tiene %dx más tareas que el menos cargado.", max / min))
                        .suggestion("Redistribuya las responsabilidades entre departamentos.")
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

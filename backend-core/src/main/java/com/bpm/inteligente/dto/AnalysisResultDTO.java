package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResultDTO {
    
    private List<Finding> findings;
    private SimulationResult simulation;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Finding {
        private String type;      // BOTTLENECK, ORPHAN, INFINITE_LOOP, DEAD_END, UNREACHABLE, INVALID_BPMN
        private String severity;  // CRITICAL, WARNING, INFO
        private String nodeId;
        private String message;
        private String suggestion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationResult {
        private double averageTotalTimeMinutes;
        private int simulatedInstances;
        private Map<String, Integer> bottleneckCounts;
        private Map<String, Double> averageNodeTimeMinutes;
        private int blockedInstances;
    }
}

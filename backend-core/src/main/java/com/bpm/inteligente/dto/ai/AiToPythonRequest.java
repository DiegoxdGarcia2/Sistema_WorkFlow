package com.bpm.inteligente.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiToPythonRequest {
    private String prompt;
    private List<WorkflowInfo> available_workflows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowInfo {
        private String id;
        private String nombre;
        private String descripcion;
    }
}

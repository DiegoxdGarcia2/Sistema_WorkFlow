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
public class AiActionDTO {
    private String explicacion;
    private List<AiAction> acciones;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiAction {
        private String tipo;
        private Map<String, Object> params;
    }
}

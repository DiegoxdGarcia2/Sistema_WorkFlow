package com.bpm.inteligente.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAssignResponse {
    private boolean success;
    private String tramiteId;
    private String politicaNombre;
    private String message;
}

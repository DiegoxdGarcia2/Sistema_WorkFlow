package com.bpm.inteligente.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiFromPythonResponse {
    private String assigned_politica_id;
    private String reason;
}

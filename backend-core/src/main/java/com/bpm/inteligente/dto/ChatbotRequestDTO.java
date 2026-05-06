package com.bpm.inteligente.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChatbotRequestDTO {
    private String mensaje;
    private String contextoSeccion; // e.g. "DISEÑADOR", "FUNCIONARIO", "ADMIN"
    private List<Map<String, String>> historial; // [{role, content}]
}

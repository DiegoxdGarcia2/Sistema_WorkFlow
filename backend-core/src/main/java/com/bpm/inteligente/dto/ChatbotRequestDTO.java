package com.bpm.inteligente.dto;

import lombok.Data;

@Data
public class ChatbotRequestDTO {
    private String mensaje;
    private String contextoSeccion; // e.g. "DISEÑADOR", "FUNCIONARIO", "ADMIN"
}

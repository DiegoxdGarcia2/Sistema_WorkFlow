package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocketMessageDTO {
    // Tipos de evento: JOIN, LEAVE, NODE_EDITING, NODE_MOVED, POLICY_UPDATED
    private String type;
    
    private ColaboradorDTO colaborador;
    
    // Payload opcional para enviar datos adicionales (ej. ID del nodo movido, nuevas coordenadas)
    private Object payload; 
}

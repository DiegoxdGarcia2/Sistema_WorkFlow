package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.ChatbotRequestDTO;
import com.bpm.inteligente.dto.ChatbotResponseDTO;
import com.bpm.inteligente.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/consultar")
    public ResponseEntity<ChatbotResponseDTO> consultar(@RequestBody ChatbotRequestDTO request) {
        System.out.println("DEBUG: Recibida petición de chatbot: " + request.getMensaje());
        ChatbotResponseDTO result = chatbotService.consultar(request);
        System.out.println("DEBUG: Enviando respuesta de chatbot: " + result.getRespuesta().substring(0, Math.min(20, result.getRespuesta().length())) + "...");
        return ResponseEntity.ok(result);
    }
}

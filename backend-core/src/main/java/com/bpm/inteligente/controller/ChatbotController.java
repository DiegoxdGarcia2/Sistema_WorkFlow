package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.ChatbotRequestDTO;
import com.bpm.inteligente.dto.ChatbotResponseDTO;
import com.bpm.inteligente.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/consultar")
    public ResponseEntity<ChatbotResponseDTO> consultar(@RequestBody ChatbotRequestDTO request) {
        System.out.println("DEBUG: Recibida petición de chatbot (síncrona): " + request.getMensaje());
        ChatbotResponseDTO result = chatbotService.consultar(request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/stream")
    public SseEmitter streamConsultar(@RequestBody ChatbotRequestDTO request) {
        System.out.println("DEBUG: Recibida petición de chatbot (streaming): " + request.getMensaje());
        return chatbotService.consultarStream(request);
    }
}

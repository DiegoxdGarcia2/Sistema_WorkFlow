package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.AiActionDTO;
import com.bpm.inteligente.dto.AiCommandDTO;
import com.bpm.inteligente.service.AiAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/asistente")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiController {

    private final AiAssistantService aiAssistantService;

    @PostMapping("/command")
    public ResponseEntity<AiActionDTO> executeCommand(@RequestBody AiCommandDTO command) {
        AiActionDTO result = aiAssistantService.ejecutarComando(command);
        return ResponseEntity.ok(result);
    }
}

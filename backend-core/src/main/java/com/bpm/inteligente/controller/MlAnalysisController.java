package com.bpm.inteligente.controller;

import com.bpm.inteligente.dto.AnalysisResultDTO;
import com.bpm.inteligente.dto.PoliticaDTO;
import com.bpm.inteligente.service.MlAnalysisService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
public class MlAnalysisController {

    private final MlAnalysisService mlAnalysisService;

    @PostMapping("/analyze")
    public ResponseEntity<AnalysisResultDTO> analyze(@RequestBody PoliticaDTO politica) {
        AnalysisResultDTO result = mlAnalysisService.analyze(politica);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/simulate")
    public ResponseEntity<AnalysisResultDTO.SimulationResult> simulate(@RequestBody SimulationRequest request) {
        AnalysisResultDTO.SimulationResult result = mlAnalysisService.simulate(request.getPolitica(), request.getInstances());
        return ResponseEntity.ok(result);
    }

    @Data
    public static class SimulationRequest {
        private PoliticaDTO politica;
        private int instances = 1000;
    }
}

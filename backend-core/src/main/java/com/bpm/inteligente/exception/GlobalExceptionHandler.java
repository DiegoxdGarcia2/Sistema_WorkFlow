package com.bpm.inteligente.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAll(Exception e) {
        System.err.println("🚨 ERROR CRÍTICO DETECTADO:");
        System.err.println("Tipo: " + e.getClass().getName());
        System.err.println("Mensaje: " + e.getMessage());
        e.printStackTrace();
        
        return ResponseEntity.internalServerError().body(Map.of(
            "error", "Internal Server Error",
            "message", e.getMessage()
        ));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<?> handleBusiness(BusinessRuleException e) {
        System.err.println("⚠️ REGLA DE NEGOCIO VIOLADA: " + e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
}

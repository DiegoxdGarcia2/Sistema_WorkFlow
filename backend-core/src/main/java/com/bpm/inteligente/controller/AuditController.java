package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.AuditLog;
import com.bpm.inteligente.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/tenant/{tenantId}")
    public List<AuditLog> listarPorTenant(@PathVariable String tenantId) {
        return auditService.listarPorTenant(tenantId);
    }
}

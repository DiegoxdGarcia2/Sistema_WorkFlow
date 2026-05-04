package com.bpm.inteligente.controller;

import com.bpm.inteligente.domain.Cliente;
import com.bpm.inteligente.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteRepository clienteRepo;

    @GetMapping("/tenant/{tenantId}")
    public List<Cliente> listarPorTenant(@PathVariable String tenantId) {
        return clienteRepo.findByTenantId(tenantId);
    }

    @GetMapping("/tenant/{tenantId}/buscar")
    public List<Cliente> buscar(@PathVariable String tenantId, @RequestParam String q) {
        if (q == null || q.trim().isEmpty()) return clienteRepo.findByTenantId(tenantId);
        // Escapar caracteres especiales de regex para seguridad
        String escaped = q.trim().replaceAll("[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ @._-]", "");
        return clienteRepo.buscarPorTermino(tenantId, escaped);
    }

    @PostMapping
    public ResponseEntity<Cliente> crear(@RequestBody Cliente cliente) {
        // Verificar duplicado por CI dentro del mismo tenant
        if (cliente.getCi() != null && !cliente.getCi().isEmpty()) {
            var existente = clienteRepo.findByTenantIdAndCi(cliente.getTenantId(), cliente.getCi());
            if (existente.isPresent()) {
                return ResponseEntity.badRequest().build();
            }
        }
        Cliente saved = clienteRepo.save(cliente);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> actualizar(@PathVariable String id, @RequestBody Cliente datos) {
        return clienteRepo.findById(id).map(existente -> {
            existente.setNombre(datos.getNombre());
            existente.setApellido(datos.getApellido());
            existente.setCi(datos.getCi());
            existente.setCorreo(datos.getCorreo());
            existente.setTelefono(datos.getTelefono());
            existente.setDireccion(datos.getDireccion());
            return ResponseEntity.ok(clienteRepo.save(existente));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        if (!clienteRepo.existsById(id)) return ResponseEntity.notFound().build();
        clienteRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

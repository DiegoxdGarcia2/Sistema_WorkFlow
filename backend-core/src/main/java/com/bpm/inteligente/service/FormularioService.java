package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.FormularioTemplate;
import com.bpm.inteligente.repository.FormularioTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FormularioService {

    private final FormularioTemplateRepository repository;

    public List<FormularioTemplate> listarPorTenant(String tenantId) {
        return repository.findByTenantId(tenantId);
    }

    public FormularioTemplate buscarPorId(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
    }

    public FormularioTemplate crear(FormularioTemplate template) {
        return repository.save(template);
    }

    public FormularioTemplate actualizar(String id, FormularioTemplate template) {
        FormularioTemplate existing = buscarPorId(id);
        existing.setNombre(template.getNombre());
        existing.setDescripcion(template.getDescripcion());
        existing.setCampos(template.getCampos());
        
        System.out.println("💾 Actualizando formulario " + id + ". Campos: " + template.getCampos().size());
        template.getCampos().forEach(c -> {
            System.out.println("   - Campo: " + c.getKey() + " | Validations: " + c.getValidations());
        });

        return repository.save(existing);
    }

    public void eliminar(String id) {
        repository.deleteById(id);
    }
}

package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "formularios_templates")
public class FormularioTemplate {

    @Id
    private String id;
    private String tenantId;
    private String nombre;
    private String descripcion;

    @Builder.Default
    private List<CampoFormulario> campos = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampoFormulario {
        private String key;
        private String label;
        private String type; // "text", "number", "date", "select", "file", "textarea"
        private boolean required;
        private List<String> options; // For select type
        private Map<String, Object> validations; // min, max, pattern, etc.
    }
}

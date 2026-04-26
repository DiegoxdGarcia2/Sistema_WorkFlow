package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "departamentos")
public class Departamento {
    @Id
    private String id;
    private String tenantId;
    private String nombre;
    private String descripcion;
    private String codigo;
    private String ubicacion;
    private Double presupuesto;
    private List<AtributoExtra> atributosExtra;
}

package com.bpm.inteligente.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "clientes")
@CompoundIndex(name = "idx_tenant_ci", def = "{'tenantId': 1, 'ci': 1}", unique = true, sparse = true)
public class Cliente {

    @Id
    private String id;

    @Indexed
    private String tenantId;

    @Indexed
    private String nombre;
    private String apellido;

    /** Cédula de identidad */
    @Indexed
    private String ci;

    @Indexed
    private String correo;
    private String telefono;
    private String direccion;

    @CreatedDate
    private Instant creadoEn;
}

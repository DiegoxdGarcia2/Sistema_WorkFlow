package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Objects;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ColaboradorDTO {
    private String id;       // ID de sesión o de usuario
    private String nombre;   // Nombre del usuario ("Diego Garcia")
    private String color;    // Color asignado para su cursor/avatar (ej. "#ef4444")
    private String avatar;   // Iniciales (ej. "DG")
    private String nodoEditandoId; // Si está editando o seleccionando un nodo específico

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ColaboradorDTO that = (ColaboradorDTO) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}

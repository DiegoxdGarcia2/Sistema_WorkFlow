package com.bpm.inteligente.dto;

import com.bpm.inteligente.domain.DocumentoVersionado;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositorioDTO {
    // Key: PoliticaNombre -> Key: ClienteNombre -> Key: TramiteLabel -> List of DocumentoVersionado
    private Map<String, Map<String, Map<String, List<DocumentoVersionado>>>> agrupacion;
}

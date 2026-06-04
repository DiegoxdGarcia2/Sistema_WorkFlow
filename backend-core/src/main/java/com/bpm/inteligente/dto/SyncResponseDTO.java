package com.bpm.inteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyncResponseDTO {
    private int enqueuedCount;
    private String status;
}

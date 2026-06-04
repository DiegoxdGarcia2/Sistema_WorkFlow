package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.SyncRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncQueueConsumer {

    private final RedisTemplate<String, Object> redisTemplate;
    private final TramiteService tramiteService;

    private static final String QUEUE_KEY = "sync:tramites:queue";

    @Scheduled(fixedDelay = 5000)
    public void processQueue() {
        log.debug("Ejecutando worker de sincronización offline...");
        
        int processedCount = 0;
        while (processedCount < 50) {
            Object obj = redisTemplate.opsForList().leftPop(QUEUE_KEY);
            if (obj == null) {
                break;
            }
            
            try {
                SyncRequestDTO request = (SyncRequestDTO) obj;
                log.info("Procesando trámite offline desde cola Redis (offlineId: {}, politicaId: {})", 
                        request.getOfflineId(), request.getPoliticaId());
                        
                tramiteService.iniciar(
                        request.getPoliticaId(),
                        request.getUsuarioId(),
                        request.getClienteId(),
                        request.getDocumentoCliente(),
                        request.getClienteNombre()
                );
                
                log.info("Trámite offline sincronizado exitosamente en MongoDB (offlineId: {})", request.getOfflineId());
            } catch (Exception e) {
                log.error("Error al procesar trámite offline de la cola Redis. Guardado en log para auditoría.", e);
            }
            processedCount++;
        }
        
        if (processedCount > 0) {
            log.info("Lote completado. Trámites procesados en esta ejecución: {}", processedCount);
        }
    }
}

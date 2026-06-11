package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.SyncRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncQueueConsumer implements SmartInitializingSingleton, DisposableBean {

    private final RedisTemplate<String, Object> redisTemplate;
    private final TramiteService tramiteService;

    private static final String QUEUE_KEY = "sync:tramites:queue";
    
    private ExecutorService executorService;
    private volatile boolean running = true;

    @Override
    public void afterSingletonsInstantiated() {
        log.info("Iniciando worker de sincronización offline reactivo (Redis BLPOP)...");
        executorService = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "sync-queue-consumer");
            t.setDaemon(true);
            return t;
        });
        executorService.submit(this::consumeQueue);
    }

    private void consumeQueue() {
        while (running) {
            try {
                // Pop bloqueante con timeout de 10 segundos
                Object obj = redisTemplate.opsForList().leftPop(QUEUE_KEY, Duration.ofSeconds(10));
                if (obj == null) {
                    continue;
                }

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
                if (running) {
                    log.error("Error al procesar trámite offline de la cola Redis. Esperando 5 segundos antes de reintentar.", e);
                    try {
                        Thread.sleep(5000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }
    }

    public void processQueue() {
        try {
            Object obj = redisTemplate.opsForList().leftPop(QUEUE_KEY);
            if (obj != null) {
                SyncRequestDTO request = (SyncRequestDTO) obj;
                tramiteService.iniciar(
                        request.getPoliticaId(),
                        request.getUsuarioId(),
                        request.getClienteId(),
                        request.getDocumentoCliente(),
                        request.getClienteNombre()
                );
            }
        } catch (Exception e) {
            log.error("Error al procesar de forma síncrona en test", e);
        }
    }

    @Override
    public void destroy() {
        log.info("Deteniendo worker de sincronización offline...");
        running = false;
        if (executorService != null) {
            executorService.shutdownNow();
        }
    }
}


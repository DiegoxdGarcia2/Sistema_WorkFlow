package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.SyncRequestDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SyncQueueProducer {

    private final RedisTemplate<String, Object> redisTemplate;
    
    private static final String QUEUE_KEY = "sync:tramites:queue";

    public void enqueue(SyncRequestDTO request) {
        log.info("Encolando trámite offline (offlineId: {}) para el usuario {}", request.getOfflineId(), request.getUsuarioId());
        redisTemplate.opsForList().rightPush(QUEUE_KEY, request);
    }

    public void enqueueAll(List<SyncRequestDTO> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }
        log.info("Encolando lote de {} trámites offline", requests.size());
        for (SyncRequestDTO req : requests) {
            enqueue(req);
        }
    }
}

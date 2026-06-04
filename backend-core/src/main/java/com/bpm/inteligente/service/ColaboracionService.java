package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.ColaboradorDTO;
import com.bpm.inteligente.dto.SocketMessageDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.util.Collection;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColaboracionService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String ROOM_KEY_PREFIX = "colaboracion:sala:";
    private static final String DOC_ROOM_KEY_PREFIX = "colaboracion:documento:sala:";
    private static final String SESSION_KEY_PREFIX = "colaboracion:sesion:";
    private static final String USER_SESSION_KEY_PREFIX = "colaboracion:usuario-sesion:";

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionInfo implements Serializable {
        private String politicaId; // Puede ser politicaId o docId
        private String userId;
        private String roomType; // "POLITICA" o "DOCUMENTO"
    }

    public Set<ColaboradorDTO> joinRoom(String politicaId, ColaboradorDTO colaborador, String sessionId) {
        if (colaborador == null || colaborador.getId() == null) {
            log.warn("joinRoom llamado con colaborador nulo para política {}", politicaId);
            return Set.of();
        }

        String roomKey = ROOM_KEY_PREFIX + politicaId;
        redisTemplate.opsForHash().put(roomKey, colaborador.getId(), colaborador);

        if (sessionId != null) {
            String sessionKey = SESSION_KEY_PREFIX + sessionId;
            redisTemplate.opsForValue().set(sessionKey, new SessionInfo(politicaId, colaborador.getId(), "POLITICA"));
            
            String userSessionKey = USER_SESSION_KEY_PREFIX + colaborador.getId();
            redisTemplate.opsForValue().set(userSessionKey, sessionId);
        }

        return getColaboradores(politicaId);
    }

    public Set<ColaboradorDTO> leaveRoom(String politicaId, String colaboradorId) {
        String roomKey = ROOM_KEY_PREFIX + politicaId;
        redisTemplate.opsForHash().delete(roomKey, colaboradorId);

        String userSessionKey = USER_SESSION_KEY_PREFIX + colaboradorId;
        Object sessionIdObj = redisTemplate.opsForValue().get(userSessionKey);
        if (sessionIdObj != null) {
            String sessionId = sessionIdObj.toString();
            redisTemplate.delete(SESSION_KEY_PREFIX + sessionId);
        }
        redisTemplate.delete(userSessionKey);

        return getColaboradores(politicaId);
    }

    // ── Métodos para Colaboración de Documentos Colaborativos ──

    public Set<ColaboradorDTO> joinDocRoom(String docId, ColaboradorDTO colaborador, String sessionId) {
        if (colaborador == null || colaborador.getId() == null) {
            log.warn("joinDocRoom llamado con colaborador nulo para documento {}", docId);
            return Set.of();
        }

        String roomKey = DOC_ROOM_KEY_PREFIX + docId;
        redisTemplate.opsForHash().put(roomKey, colaborador.getId(), colaborador);

        if (sessionId != null) {
            String sessionKey = SESSION_KEY_PREFIX + sessionId;
            redisTemplate.opsForValue().set(sessionKey, new SessionInfo(docId, colaborador.getId(), "DOCUMENTO"));
            
            String userSessionKey = USER_SESSION_KEY_PREFIX + colaborador.getId();
            redisTemplate.opsForValue().set(userSessionKey, sessionId);
        }

        return getDocColaboradores(docId);
    }

    public Set<ColaboradorDTO> leaveDocRoom(String docId, String colaboradorId) {
        String roomKey = DOC_ROOM_KEY_PREFIX + docId;
        redisTemplate.opsForHash().delete(roomKey, colaboradorId);

        String userSessionKey = USER_SESSION_KEY_PREFIX + colaboradorId;
        Object sessionIdObj = redisTemplate.opsForValue().get(userSessionKey);
        if (sessionIdObj != null) {
            String sessionId = sessionIdObj.toString();
            redisTemplate.delete(SESSION_KEY_PREFIX + sessionId);
        }
        redisTemplate.delete(userSessionKey);

        return getDocColaboradores(docId);
    }

    @SuppressWarnings("unchecked")
    public Set<ColaboradorDTO> getDocColaboradores(String docId) {
        String roomKey = DOC_ROOM_KEY_PREFIX + docId;
        Collection<Object> values = redisTemplate.opsForHash().values(roomKey);
        return values.stream()
                .filter(Objects::nonNull)
                .map(obj -> (ColaboradorDTO) obj)
                .collect(Collectors.toSet());
    }

    public void publishToDocRoom(String docId, SocketMessageDTO message) {
        redisTemplate.convertAndSend("websocket:documento:" + docId, message);
    }

    // ─────────────────────────────────────────────────────────

    public void handleDisconnect(String sessionId) {
        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        Object sessionInfoObj = redisTemplate.opsForValue().get(sessionKey);
        if (sessionInfoObj != null) {
            SessionInfo info = (SessionInfo) sessionInfoObj;
            String type = info.getRoomType() != null ? info.getRoomType() : "POLITICA";

            if ("DOCUMENTO".equals(type)) {
                log.info("Limpiando desconexión abrupta en Redis: User {} de Documento {}", info.getUserId(), info.getPoliticaId());
                Set<ColaboradorDTO> colaboradores = leaveDocRoom(info.getPoliticaId(), info.getUserId());
                SocketMessageDTO msg = SocketMessageDTO.builder()
                        .type("ROOM_STATE")
                        .payload(colaboradores)
                        .build();
                publishToDocRoom(info.getPoliticaId(), msg);
            } else {
                log.info("Limpiando desconexión abrupta en Redis: User {} de Sala {}", info.getUserId(), info.getPoliticaId());
                Set<ColaboradorDTO> colaboradores = leaveRoom(info.getPoliticaId(), info.getUserId());
                SocketMessageDTO msg = SocketMessageDTO.builder()
                        .type("ROOM_STATE")
                        .payload(colaboradores)
                        .build();
                publishToRoom(info.getPoliticaId(), msg);
            }
        }
    }

    public void updateColaboradorStatus(String politicaId, String colaboradorId, String nodoEditandoId) {
        String roomKey = ROOM_KEY_PREFIX + politicaId;
        Object colaboradorObj = redisTemplate.opsForHash().get(roomKey, colaboradorId);
        if (colaboradorObj != null) {
            ColaboradorDTO colaborador = (ColaboradorDTO) colaboradorObj;
            colaborador.setNodoEditandoId(nodoEditandoId);
            redisTemplate.opsForHash().put(roomKey, colaboradorId, colaborador);
        }
    }

    @SuppressWarnings("unchecked")
    public Set<ColaboradorDTO> getColaboradores(String politicaId) {
        String roomKey = ROOM_KEY_PREFIX + politicaId;
        Collection<Object> values = redisTemplate.opsForHash().values(roomKey);
        return values.stream()
                .filter(Objects::nonNull)
                .map(obj -> (ColaboradorDTO) obj)
                .collect(Collectors.toSet());
    }

    public void publishToRoom(String politicaId, SocketMessageDTO message) {
        redisTemplate.convertAndSend("websocket:politica:" + politicaId, message);
    }
}

package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.ColaboradorDTO;
import com.bpm.inteligente.dto.SocketMessageDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColaboracionService {

    private final SimpMessagingTemplate messagingTemplate;

    // Mapa: PoliticaID -> Set de Colaboradores
    private final Map<String, Set<ColaboradorDTO>> activeRooms = new ConcurrentHashMap<>();
    
    // Mapa: SessionID -> Info de sesión (politicaId, userId) para limpieza rápida
    private final Map<String, SessionInfo> sessionMap = new ConcurrentHashMap<>();

    private record SessionInfo(String politicaId, String userId) {}

    public Set<ColaboradorDTO> joinRoom(String politicaId, ColaboradorDTO colaborador, String sessionId) {
        activeRooms.putIfAbsent(politicaId, ConcurrentHashMap.newKeySet());
        Set<ColaboradorDTO> room = activeRooms.get(politicaId);
        
        // Remove existing if reconnecting
        room.removeIf(c -> c.getId().equals(colaborador.getId()));
        room.add(colaborador);
        
        // Registrar sesión
        if (sessionId != null) {
            sessionMap.put(sessionId, new SessionInfo(politicaId, colaborador.getId()));
        }
        
        return room;
    }

    public Set<ColaboradorDTO> leaveRoom(String politicaId, String colaboradorId) {
        Set<ColaboradorDTO> room = activeRooms.get(politicaId);
        if (room != null) {
            room.removeIf(c -> c.getId().equals(colaboradorId));
            if (room.isEmpty()) {
                activeRooms.remove(politicaId);
            }
        }
        
        // Limpiar de sessionMap
        sessionMap.entrySet().removeIf(entry -> 
            entry.getValue().politicaId().equals(politicaId) && 
            entry.getValue().userId().equals(colaboradorId)
        );
        
        return room == null ? Set.of() : room;
    }

    public void handleDisconnect(String sessionId) {
        SessionInfo info = sessionMap.remove(sessionId);
        if (info != null) {
            log.info("Limpiando desconexión abrupta: User {} de Sala {}", info.userId(), info.politicaId());
            Set<ColaboradorDTO> colaboradores = leaveRoom(info.politicaId(), info.userId());
            
            // Broadcast del nuevo estado de la sala
            SocketMessageDTO msg = SocketMessageDTO.builder()
                    .type("ROOM_STATE")
                    .payload(colaboradores)
                    .build();
            messagingTemplate.convertAndSend("/topic/politica/" + info.politicaId(), msg);
        }
    }

    public void updateColaboradorStatus(String politicaId, String colaboradorId, String nodoEditandoId) {
        Set<ColaboradorDTO> room = activeRooms.get(politicaId);
        if (room != null) {
            for (ColaboradorDTO c : room) {
                if (c.getId().equals(colaboradorId)) {
                    c.setNodoEditandoId(nodoEditandoId);
                    break;
                }
            }
        }
    }

    public Set<ColaboradorDTO> getColaboradores(String politicaId) {
        return activeRooms.getOrDefault(politicaId, Set.of());
    }
}

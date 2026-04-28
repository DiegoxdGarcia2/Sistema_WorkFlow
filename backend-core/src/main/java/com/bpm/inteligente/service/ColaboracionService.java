package com.bpm.inteligente.service;

import com.bpm.inteligente.dto.ColaboradorDTO;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ColaboracionService {

    // Mapa: PoliticaID -> Set de Colaboradores
    private final Map<String, Set<ColaboradorDTO>> activeRooms = new ConcurrentHashMap<>();

    public Set<ColaboradorDTO> joinRoom(String politicaId, ColaboradorDTO colaborador) {
        activeRooms.putIfAbsent(politicaId, ConcurrentHashMap.newKeySet());
        Set<ColaboradorDTO> room = activeRooms.get(politicaId);
        
        // Remove existing if reconnecting
        room.removeIf(c -> c.getId().equals(colaborador.getId()));
        room.add(colaborador);
        
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
        return room == null ? Set.of() : room;
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

package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.Actividad;
import com.bpm.inteligente.domain.Calle;
import com.bpm.inteligente.domain.PoliticaNegocio;
import com.bpm.inteligente.domain.Transicion;
import com.bpm.inteligente.domain.enums.TipoActividad;
import com.bpm.inteligente.domain.enums.TipoRuta;
import com.bpm.inteligente.exception.BusinessRuleException;
import com.bpm.inteligente.exception.ResourceNotFoundException;
import com.bpm.inteligente.repository.PoliticaNegocioRepository;
import com.bpm.inteligente.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PoliticaNegocioService {

    private final PoliticaNegocioRepository politicaRepo;
    private final TenantRepository tenantRepo;

    /**
     * Crea una nueva política. Si viene vacía (sin calles/actividades),
     * auto-genera una estructura base con 1 calle, INICIO→FIN y 1 transición.
     * La validación de grafo se aplica solo al ACTIVAR, no al crear.
     */
    @Transactional
    @CacheEvict(value = {"politicas", "politicas_por_tenant", "politicas_activas_por_tenant"}, allEntries = true)
    public PoliticaNegocio crear(PoliticaNegocio politica) {
        // 1. Validar que el Tenant exista
        if (!tenantRepo.existsById(politica.getTenantId())) {
            throw new ResourceNotFoundException("Tenant", "id", politica.getTenantId());
        }

        // 2. Auto-asignar versión si no viene
        if (politica.getVersion() <= 0) {
            politica.setVersion(1);
        }

        // 3. Validar unicidad tenant + nombre + version
        if (politicaRepo.existsByTenantIdAndNombreAndVersion(
                politica.getTenantId(), politica.getNombre(), politica.getVersion())) {
            throw new BusinessRuleException(
                    String.format("Ya existe la política '%s' v%d para este tenant",
                            politica.getNombre(), politica.getVersion()));
        }

        // 4. Auto-generar estructura base si viene vacía
        if (politica.getCalles() == null || politica.getCalles().isEmpty() || 
            politica.getCalles().stream().allMatch(c -> c.getActividades() == null || c.getActividades().isEmpty())) {
            generarEstructuraBase(politica);
        }

        politica.setCreadoEn(Instant.now());
        politica.setActualizadoEn(Instant.now());
        return politicaRepo.save(politica);
    }

    /**
     * Actualiza la topología (calles, actividades, transiciones) de una política
     * que NO esté activa. Las políticas activas son inmutables.
     */
    @Transactional
    @CacheEvict(value = {"politicas", "politicas_por_tenant", "politicas_activas_por_tenant"}, allEntries = true)
    public PoliticaNegocio actualizar(String politicaId, PoliticaNegocio datosActualizados) {
        PoliticaNegocio existente = buscarPorId(politicaId);

        if (existente.isEstaActiva()) {
            throw new BusinessRuleException(
                    "No se puede modificar una política activa. Cree una nueva versión.");
        }

        existente.setNombre(datosActualizados.getNombre());
        existente.setDescripcion(datosActualizados.getDescripcion());
        existente.setCalles(datosActualizados.getCalles());
        existente.setTransiciones(datosActualizados.getTransiciones());
        existente.setRequisitosIniciales(datosActualizados.getRequisitosIniciales());
        existente.setActualizadoEn(Instant.now());
        return politicaRepo.save(existente);
    }

    /**
     * Activa una política para que pueda generar trámites.
     * Valida la estructura del grafo antes de activar.
     * Despublica automáticamente cualquier otra versión activa del mismo nombre en el tenant.
     */
    @Transactional
    @CacheEvict(value = {"politicas", "politicas_por_tenant", "politicas_activas_por_tenant"}, allEntries = true)
    public PoliticaNegocio activar(String politicaId) {
        PoliticaNegocio politica = buscarPorId(politicaId);
        validarEstructuraGrafo(politica);

        // Despublicar todas las otras versiones activas con el mismo nombre en el mismo tenant
        List<PoliticaNegocio> otrasActivas = politicaRepo.findByTenantIdAndEstaActiva(politica.getTenantId(), true);
        for (PoliticaNegocio otra : otrasActivas) {
            if (!otra.getId().equals(politicaId) && otra.getNombre().equalsIgnoreCase(politica.getNombre())) {
                otra.setEstaActiva(false);
                otra.setActualizadoEn(Instant.now());
                politicaRepo.save(otra);
            }
        }

        politica.setEstaActiva(true);
        politica.setActualizadoEn(Instant.now());
        return politicaRepo.save(politica);
    }

    /**
     * Elimina una política (DRAFT o LIVE).
     * Si está activa, se puede eliminar solo si se pasa force=true.
     */
    @Transactional
    @CacheEvict(value = {"politicas", "politicas_por_tenant", "politicas_activas_por_tenant"}, allEntries = true)
    public void eliminar(String politicaId) {
        eliminar(politicaId, false);
    }

    @Transactional
    @CacheEvict(value = {"politicas", "politicas_por_tenant", "politicas_activas_por_tenant"}, allEntries = true)
    public void eliminar(String politicaId, boolean force) {
        PoliticaNegocio politica = buscarPorId(politicaId);
        if (politica.isEstaActiva() && !force) {
            throw new BusinessRuleException("No se puede eliminar una política activa. Use la opción de forzar eliminación.");
        }
        politicaRepo.deleteById(politicaId);
    }

    @Cacheable(value = "politicas", key = "#id")
    public PoliticaNegocio buscarPorId(String id) {
        return politicaRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PoliticaNegocio", "id", id));
    }

    @Cacheable(value = "politicas_por_tenant", key = "#tenantId")
    public List<PoliticaNegocio> listarPorTenant(String tenantId) {
        return politicaRepo.findByTenantId(tenantId);
    }

    @Cacheable(value = "politicas_activas_por_tenant", key = "#tenantId")
    public List<PoliticaNegocio> listarActivasPorTenant(String tenantId) {
        return politicaRepo.findByTenantIdAndEstaActiva(tenantId, true);
    }

    public List<PoliticaNegocio> listarIniciablesPorUsuario(String tenantId, String departamentoId, String rol) {
        List<PoliticaNegocio> activas = listarActivasPorTenant(tenantId);
        
        // El rol desde el frontend es ADMINISTRADOR
        if ("ADMINISTRADOR".equals(rol) || "ADMIN".equals(rol)) return activas;

        return activas.stream().filter(p -> {
            // Buscar actividad inicial
            Actividad inicio = p.getCalles().stream()
                    .flatMap(c -> c.getActividades().stream())
                    .filter(a -> a.getTipo() == TipoActividad.INICIO)
                    .findFirst().orElse(null);

            if (inicio == null) return false;

            // Buscar calle que contiene ese inicio
            Calle calleInicio = p.getCalles().stream()
                    .filter(c -> c.getActividades().stream().anyMatch(a -> a.getId().equals(inicio.getId())))
                    .findFirst().orElse(null);

            if (calleInicio == null) return false;
            
            String deptoCalle = calleInicio.getDepartamentoId();
            
            // Si la calle no tiene departamento asignado, el trámite está mal configurado o restringido.
            // No permitimos que aparezca en la lista de iniciables para evitar errores en UX.
            if (deptoCalle == null || deptoCalle.isEmpty() || deptoCalle.equals("null")) return false;

            return deptoCalle.equals(departamentoId);
        }).toList();
    }

    // ── Helpers privados ─────────────────────────────────────────

    /**
     * Auto-genera una estructura mínima válida: 1 calle con INICIO→FIN.
     */
    private void generarEstructuraBase(PoliticaNegocio politica) {
        String inicioId = UUID.randomUUID().toString();
        String finId = UUID.randomUUID().toString();

        Actividad inicio = Actividad.builder()
                .id(inicioId)
                .nombre("Inicio del Proceso")
                .tipo(TipoActividad.INICIO)
                .esInicial(true).esFinal(false).orden(0)
                .build();

        Actividad fin = Actividad.builder()
                .id(finId)
                .nombre("Fin del Proceso")
                .tipo(TipoActividad.FIN)
                .esInicial(false).esFinal(true).orden(1)
                .build();

        // Usar el nombre de departamento del creador si viene en las calles pre-existentes,
        // de lo contrario usar nombre genérico que el diseñador debe configurar
        String calleNombre = "Mi Departamento";
        String calleDptoId = null;
        if (politica.getCalles() != null && !politica.getCalles().isEmpty()) {
            Calle primeraCalle = politica.getCalles().get(0);
            if (primeraCalle.getNombre() != null && !primeraCalle.getNombre().isEmpty()) {
                calleNombre = primeraCalle.getNombre();
            }
            if (primeraCalle.getDepartamentoId() != null) {
                calleDptoId = primeraCalle.getDepartamentoId();
            }
        }

        Calle calleInicial = Calle.builder()
                .id(UUID.randomUUID().toString())
                .nombre(calleNombre)
                .departamentoId(calleDptoId)
                .orden(0)
                .actividades(new ArrayList<>(List.of(inicio, fin)))
                .build();

        Transicion transicion = Transicion.builder()
                .id(UUID.randomUUID().toString())
                .origenId(inicioId)
                .destinoId(finId)
                .tipoRuta(TipoRuta.SECUENCIAL)
                .prioridad(0)
                .build();

        politica.setCalles(new ArrayList<>(List.of(calleInicial)));
        politica.setTransiciones(new ArrayList<>(List.of(transicion)));
    }


    /**
     * Valida que el grafo tenga al menos un nodo INICIO y un nodo FIN.
     */
    private void validarEstructuraGrafo(PoliticaNegocio politica) {
        List<Actividad> todasActividades = politica.getCalles().stream()
                .flatMap(c -> c.getActividades().stream())
                .toList();

        if (todasActividades.isEmpty()) {
            throw new BusinessRuleException("La política debe contener al menos una actividad.");
        }

        boolean tieneInicio = todasActividades.stream()
                .anyMatch(a -> a.getTipo() == TipoActividad.INICIO);
        boolean tieneFin = todasActividades.stream()
                .anyMatch(a -> a.getTipo() == TipoActividad.FIN);

        if (!tieneInicio) {
            throw new BusinessRuleException("La política debe tener al menos un nodo de tipo INICIO.");
        }
        if (!tieneFin) {
            throw new BusinessRuleException("La política debe tener al menos un nodo de tipo FIN.");
        }
    }
}

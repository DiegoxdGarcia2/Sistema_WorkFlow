package com.bpm.inteligente.config;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.*;
import com.bpm.inteligente.repository.*;
import com.bpm.inteligente.service.RegistroActividadService;
import com.bpm.inteligente.service.TramiteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepo;
    private final UsuarioRepository usuarioRepo;
    private final PoliticaNegocioRepository politicaRepo;
    private final TramiteService tramiteService;
    private final RegistroActividadService registroService;
    private final RegistroActividadRepository registroRepo;

    @Override
    public void run(String... args) {
        if (tenantRepo.count() > 0) {
            log.info("⏭️  Base de datos ya tiene datos. Seeder omitido.");
            return;
        }

        log.info("🌱 Iniciando seeder de datos de prueba...");

        // ── 1. Tenant ────────────────────────────────────────────
        Tenant cre = tenantRepo.save(Tenant.builder()
                .id(UUID.randomUUID().toString())
                .nombre("CRE")
                .build());
        log.info("✅ Tenant creado: {}", cre.getNombre());

        // ── 2. Usuarios ──────────────────────────────────────────
        Usuario admin = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cre.getId())
                .nombre("Carlos Administrador")
                .email("admin@cre.com")
                .password("admin123")
                .rol(RolUsuario.ADMINISTRADOR)
                .build());

        Usuario disenador = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cre.getId())
                .nombre("María Diseñadora")
                .email("disenador@cre.com")
                .password("diseno123")
                .rol(RolUsuario.DISENADOR)
                .build());

        Usuario funcionario = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cre.getId())
                .nombre("Juan Funcionario")
                .email("funcionario@cre.com")
                .password("func123")
                .rol(RolUsuario.FUNCIONARIO)
                .build());

        Usuario cliente = usuarioRepo.save(Usuario.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cre.getId())
                .nombre("Pedro Cliente")
                .email("cliente@cre.com")
                .password("cliente123")
                .rol(RolUsuario.CLIENTE)
                .build());

        log.info("✅ 4 usuarios creados (Admin, Diseñador, Funcionario, Cliente)");

        // ── 3. Política de Negocio: Instalación de Medidor ───────

        // Actividades
        String actRecepcionId = UUID.randomUUID().toString();
        String actInspeccionId = UUID.randomUUID().toString();
        String actFacturaId = UUID.randomUUID().toString();

        Actividad recepcion = Actividad.builder()
                .id(actRecepcionId)
                .nombre("Recepción de Solicitud")
                .tipo(TipoActividad.INICIO)
                .esInicial(true).esFinal(false).orden(0)
                .build();

        Actividad inspeccion = Actividad.builder()
                .id(actInspeccionId)
                .nombre("Inspección Técnica")
                .tipo(TipoActividad.TAREA)
                .esInicial(false).esFinal(false).orden(0)
                .build();

        Actividad factura = Actividad.builder()
                .id(actFacturaId)
                .nombre("Emisión de Factura")
                .tipo(TipoActividad.FIN)
                .esInicial(false).esFinal(true).orden(0)
                .build();

        // Calles
        Calle atencion = Calle.builder()
                .id(UUID.randomUUID().toString())
                .nombre("Atención al Cliente").orden(0)
                .actividades(List.of(recepcion))
                .build();

        Calle tecnico = Calle.builder()
                .id(UUID.randomUUID().toString())
                .nombre("Departamento Técnico").orden(1)
                .actividades(List.of(inspeccion))
                .build();

        Calle finanzas = Calle.builder()
                .id(UUID.randomUUID().toString())
                .nombre("Finanzas").orden(2)
                .actividades(List.of(factura))
                .build();

        // Transiciones
        Transicion t1 = Transicion.builder()
                .id(UUID.randomUUID().toString())
                .origenId(actRecepcionId).destinoId(actInspeccionId)
                .tipoRuta(TipoRuta.SECUENCIAL).prioridad(0)
                .build();

        Transicion t2 = Transicion.builder()
                .id(UUID.randomUUID().toString())
                .origenId(actInspeccionId).destinoId(actFacturaId)
                .tipoRuta(TipoRuta.SECUENCIAL).prioridad(0)
                .build();

        // Guardar política y activarla
        PoliticaNegocio politica = politicaRepo.save(PoliticaNegocio.builder()
                .id(UUID.randomUUID().toString())
                .tenantId(cre.getId())
                .nombre("Instalación de Medidor")
                .descripcion("Flujo completo para la instalación de un nuevo medidor eléctrico")
                .version(1)
                .estaActiva(true)
                .calles(List.of(atencion, tecnico, finanzas))
                .transiciones(List.of(t1, t2))
                .build());

        log.info("✅ Política '{}' creada y activada con 3 calles y 2 transiciones", politica.getNombre());

        // ── 4. Trámite inicial con registro asignado ─────────────
        Tramite tramite = tramiteService.iniciar(politica.getId());
        log.info("✅ Trámite iniciado: {}", tramite.getId());

        // Asignar el primer registro al funcionario de prueba
        List<RegistroActividad> registros = registroRepo.findByTramiteId(tramite.getId());
        if (!registros.isEmpty()) {
            RegistroActividad primer = registros.get(0);
            registroService.tomarTarea(primer.getId(), funcionario.getId());
            log.info("✅ Tarea '{}' asignada a {}", recepcion.getNombre(), funcionario.getNombre());
        }

        log.info("🎉 Seeder completado. BD lista para pruebas.");
    }
}

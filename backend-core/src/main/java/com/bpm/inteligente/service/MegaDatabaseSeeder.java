package com.bpm.inteligente.service;

import com.bpm.inteligente.domain.*;
import com.bpm.inteligente.domain.enums.*;
import com.bpm.inteligente.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MegaDatabaseSeeder {

    private final TenantRepository tenantRepo;
    private final UsuarioRepository usuarioRepo;
    private final PoliticaNegocioRepository politicaRepo;
    private final RegistroActividadRepository registroRepo;
    private final ProyectoRepository proyectoRepo;
    private final CargoRepository cargoRepo;
    private final DepartamentoRepository departamentoRepo;
    private final FormularioTemplateRepository templateRepo;
    private final TramiteRepository tramiteRepo;
    private final AuditLogRepository auditRepo;
    private final ClienteRepository clienteRepo;
    private final PasswordEncoder passwordEncoder;
    private final MongoTemplate mongoTemplate;

    @Value("${ai.microservice.url:http://localhost:8000}")
    private String aiMicroserviceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // Tenant 1: CRE (Electricity)
    private static final String TENANT_CRE_ID = "f68512a1-95e3-4133-9571-84147ea8e10b";
    private static final String ADMIN_CRE_ID = "a1111111-1111-1111-1111-111111111111";
    private static final String DISENADOR_CRE_ID = "d2222222-2222-2222-2222-222222222222";
    private static final String FUNC_JUAN_ID = "j3333333-3333-3333-3333-333333333333";
    private static final String DEPT_GER_ID = "de111111-1111-1111-1111-111111111111";
    private static final String DEPT_IT_ID = "de222222-2222-2222-2222-222222222222";
    private static final String DEPT_OPE_ID = "de333333-3333-3333-3333-333333333333";
    private static final String DEPT_ATC_ID = "de444444-4444-4444-4444-444444444444";

    // Fixed Policy & Activity IDs for CRE
    private static final String POLITICA_MEDIDOR_ID = "88dd3ebc-8f37-4124-a1ce-6ecc8e401cee";
    private static final String ACT_RECEPCION_ID = "09f36993-c72f-453b-80c2-4c3b3a222af9";
    private static final String ACT_INSPECCION_ID = "625b7022-5200-4a5a-9114-5ef0da95f596";
    private static final String ACT_EVALUACION_ID = "ae09104b-27ff-49af-a5bb-660a161fa8db";
    private static final String ACT_PRESUPUESTO_ID = "aee7e856-3f7e-41f1-ba7c-7a936980ec32";
    private static final String ACT_FACTURA_ID = "e03ee9a7-6b84-455d-94b2-34265319a467";
    private static final String ACT_ENTREGA_ID = "a43837e5-5111-421b-8433-59c608efd0db";

    // Tenant 2: Sinergia Telecom (1 Year history)
    private static final String TENANT_SINERGIA_ID = "t3333333-3333-3333-3333-333333333333";
    private static final String DEPT_S_DIR_ID = "ds111111-1111-1111-1111-111111111111";
    private static final String DEPT_S_VTA_ID = "ds222222-2222-2222-2222-222222222222";
    private static final String DEPT_S_ING_ID = "ds333333-3333-3333-3333-333333333333";
    private static final String DEPT_S_LOG_ID = "ds444444-4444-4444-4444-444444444444";
    private static final String DEPT_S_FAC_ID = "ds555555-5555-5555-5555-555555555555";

    // Fixed Policy & Activity IDs for Sinergia Flow 1: Instalación Enlace Dedicado
    private static final String POLITICA_ENLACE_ID = "sinergia-pol-dedicated-link-001";
    private static final String ACT_S_CONTRATO_ID = "s-act-contrato-001";
    private static final String ACT_S_ESTUDIO_ID = "s-act-estudio-002";
    private static final String ACT_S_DESPACHO_ID = "s-act-despacho-003";
    private static final String ACT_S_TENDIDO_ID = "s-act-tendido-004";
    private static final String ACT_S_PRUEBAS_ID = "s-act-pruebas-005";
    private static final String ACT_S_ACTA_ID = "s-act-acta-006";
    private static final String ACT_S_FACTURACION_ID = "s-act-facturacion-007";

    // Fixed Policy & Activity IDs for Sinergia Flow 2: Soporte Técnico
    private static final String POLITICA_SOPORTE_ID = "sinergia-pol-tech-support-002";
    private static final String ACT_S_SOP_TICKET_ID = "s-sop-ticket-001";
    private static final String ACT_S_SOP_DIAG_ID = "s-sop-diagnostico-002";
    private static final String ACT_S_SOP_CAMPO_DEC_ID = "s-sop-campo-dec-003";
    private static final String ACT_S_SOP_VISITA_ID = "s-sop-visita-004";
    private static final String ACT_S_SOP_VALIDAR_ID = "s-sop-validar-005";
    private static final String ACT_S_SOP_CIERRE_ID = "s-sop-cierre-006";

    // Fixed Policy & Activity IDs for Sinergia Flow 3: Renovación de Contratos
    private static final String POLITICA_RENOVACION_ID = "sinergia-pol-contract-renewal-003";
    private static final String ACT_S_REN_SOLICITUD_ID = "s-ren-solicitud-001";
    private static final String ACT_S_REN_EVAL_FIN_ID = "s-ren-eval-fin-002";
    private static final String ACT_S_REN_APROB_TEC_ID = "s-ren-aprob-tec-003";
    private static final String ACT_S_REN_FIRMA_ID = "s-ren-firma-004";
    private static final String ACT_S_REN_RECONFIG_ID = "s-ren-reconfig-005";
    private static final String ACT_S_REN_CIERRE_ID = "s-ren-cierre-006";

    public void runMegaSeeder() {
        log.info("🚀 Iniciando MEGA SEEDER de datos de prueba...");

        // Clean up only specific seeded tenant IDs to protect other users' data
        List<String> tenantsToClean = List.of(TENANT_CRE_ID, TENANT_SINERGIA_ID);
        for (String tid : tenantsToClean) {
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Tenant.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Usuario.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Cargo.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Departamento.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), FormularioTemplate.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), PoliticaNegocio.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Proyecto.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Tramite.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), RegistroActividad.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), AuditLog.class);
            mongoTemplate.remove(new Query(Criteria.where("tenantId").is(tid)), Cliente.class);
        }
        log.info("🧹 MongoDB: Datos previos de CRE y Sinergia eliminados.");

        Random random = new Random();

        // =========================================================================
        // SEEDER 1: CRE - COOPERATIVA ELECTRICA
        // =========================================================================
        Tenant cre = tenantRepo.save(Tenant.builder()
                .id(TENANT_CRE_ID).nombre("CRE - Cooperativa Eléctrica")
                .nit("1020304050").direccion("Av. Busch esq. 2do Anillo").industria("Servicios Públicos")
                .sitioWeb("https://www.cre.com.bo").telefonoInstitucional("+591 3 3366666")
                .emailContacto("contacto@cre.com.bo").lema("Iluminando el desarrollo regional.")
                .build());

        Cargo cGerente = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Gerente General").codigo("GG-01").nivel("Directivo").salarioBase(15000.0).build());
        Cargo cAnalista = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Analista de Sistemas").codigo("IT-01").nivel("Técnico").salarioBase(8500.0).build());
        Cargo cAtencion = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Atención al Cliente").codigo("ATC-01").nivel("Operativo").salarioBase(4500.0).build());
        Cargo cTecnico = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Técnico Electricista").codigo("TEC-01").nivel("Operativo").salarioBase(5500.0).build());

        Departamento dGerencia = departamentoRepo.save(Departamento.builder().id(DEPT_GER_ID).tenantId(cre.getId()).nombre("Gerencia").codigo("DEP-GER").ubicacion("P5").presupuesto(500000.0).build());
        Departamento dIT = departamentoRepo.save(Departamento.builder().id(DEPT_IT_ID).tenantId(cre.getId()).nombre("IT").codigo("DEP-IT").ubicacion("P3").presupuesto(1200000.0).build());
        Departamento dOperaciones = departamentoRepo.save(Departamento.builder().id(DEPT_OPE_ID).tenantId(cre.getId()).nombre("Operaciones").codigo("DEP-OPE").ubicacion("PB").presupuesto(800000.0).build());
        Departamento dAtencion = departamentoRepo.save(Departamento.builder().id(DEPT_ATC_ID).tenantId(cre.getId()).nombre("Atención").codigo("DEP-ATC").ubicacion("PB").presupuesto(300000.0).build());

        Usuario adminCre = crearUsuario(ADMIN_CRE_ID, cre.getId(), "Carlos", "Mendoza", "admin@cre.com", "admin123", RolUsuario.ADMINISTRADOR, cGerente.getNombre(), dGerencia.getNombre(), dGerencia.getId(), "+591 70010010");
        Usuario disenadorCre = crearUsuario(DISENADOR_CRE_ID, cre.getId(), "María", "García", "diseno@cre.com", "diseno123", RolUsuario.DISENADOR, cAnalista.getNombre(), dIT.getNombre(), dIT.getId(), "+591 70020020");
        Usuario funcJuan = crearUsuario(FUNC_JUAN_ID, cre.getId(), "Juan", "Pérez", "juan@cre.com", "func123", RolUsuario.FUNCIONARIO, cAtencion.getNombre(), dAtencion.getNombre(), dAtencion.getId(), "+591 70030030");
        Usuario funcAna = usuarioRepo.save(crearUsuario(uid(), cre.getId(), "Ana", "Rodríguez", "ana@cre.com", "func123", RolUsuario.FUNCIONARIO, cAtencion.getNombre(), dAtencion.getNombre(), dAtencion.getId(), "+591 70040040"));
        Usuario funcRoberto = usuarioRepo.save(crearUsuario(uid(), cre.getId(), "Roberto", "Flores", "roberto@cre.com", "func123", RolUsuario.FUNCIONARIO, cTecnico.getNombre(), dOperaciones.getNombre(), dOperaciones.getId(), "+591 70050050"));
        Usuario funcLucia = usuarioRepo.save(crearUsuario(uid(), cre.getId(), "Lucía", "Vargas", "lucia@cre.com", "func123", RolUsuario.FUNCIONARIO, cTecnico.getNombre(), dOperaciones.getNombre(), dOperaciones.getId(), "+591 70060060"));

        FormularioTemplate ft1 = templateRepo.save(FormularioTemplate.builder()
                .id(uid()).tenantId(cre.getId()).nombre("Solicitud de Nuevo Medidor")
                .descripcion("Datos iniciales para instalación.")
                .campos(List.of(
                        campo("nombreTitular", "Nombre Completo", "text", true),
                        campo("tipoInmueble", "Tipo de Inmueble", "select", true, List.of("Casa", "Negocio")),
                        campo("direccion", "Dirección Exacta", "textarea", true)
                )).build());

        FormularioTemplate ft2 = templateRepo.save(FormularioTemplate.builder()
                .id(uid()).tenantId(cre.getId()).nombre("Informe de Inspección")
                .descripcion("Resultados de verificación técnica.")
                .campos(List.of(
                        campo("factibilidad", "Factibilidad", "select", true, List.of("Aprobado", "Rechazado")),
                        campo("observaciones", "Observaciones", "textarea", false)
                )).build());

        Proyecto proyectoCre = proyectoRepo.save(Proyecto.builder()
                .id(uid()).tenantId(cre.getId()).nombre("Servicios Eléctricos")
                .estado("ACTIVO").responsable(disenadorCre.getNombre()).responsableId(disenadorCre.getId())
                .build());

        PoliticaNegocio p1 = PoliticaNegocio.builder()
                .id(POLITICA_MEDIDOR_ID).tenantId(cre.getId()).proyectoId(proyectoCre.getId())
                .nombre("Instalación de Medidor Eléctrico")
                .descripcion("Flujo completo para la instalación de un nuevo medidor eléctrico residencial o comercial, incluyendo inspección técnica y facturación.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Atención al Cliente", dAtencion.getId(), 0, "#6366f1", List.of(
                                actividad(ACT_RECEPCION_ID, "Recepción de Solicitud", TipoActividad.INICIO, true, false, 0),
                                actividad(ACT_ENTREGA_ID, "Entrega de Medidor", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Departamento Técnico", dOperaciones.getId(), 1, "#22c55e", List.of(
                                actividad(ACT_INSPECCION_ID, "Inspección de Terreno", TipoActividad.TAREA, false, false, 0),
                                actividad(ACT_EVALUACION_ID, "Evaluación Técnica", TipoActividad.DECISION, false, false, 1)
                        )),
                        calle("Finanzas", dIT.getId(), 2, "#f97316", List.of(
                                actividad(ACT_PRESUPUESTO_ID, "Cálculo de Presupuesto", TipoActividad.TAREA, false, false, 0),
                                actividad(ACT_FACTURA_ID, "Emisión de Factura", TipoActividad.TAREA, false, false, 1)
                        ))
                ))
                .transiciones(List.of(
                        transicion(ACT_RECEPCION_ID, ACT_INSPECCION_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_INSPECCION_ID, ACT_EVALUACION_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_EVALUACION_ID, ACT_PRESUPUESTO_ID, TipoRuta.CONDICIONAL, "Aprobado"),
                        transicion(ACT_EVALUACION_ID, ACT_ENTREGA_ID, TipoRuta.CONDICIONAL, "Rechazado"),
                        transicion(ACT_PRESUPUESTO_ID, ACT_FACTURA_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_FACTURA_ID, ACT_ENTREGA_ID, TipoRuta.SECUENCIAL, "")
                ))
                .build();
        p1.getCalles().get(0).getActividades().get(0).setPlantillaId(ft1.getId());
        p1.getCalles().get(0).getActividades().get(0).setEsquemaFormulario(Map.of("fields", ft1.getCampos()));
        politicaRepo.save(p1);

        // Seeder de Clientes CRE
        log.info("⚙️ Creando clientes de base de datos para CRE...");
        List<String> nombresClientesCre = List.of("Diego Garcia", "Juan Perez", "Maria Gomez", "Ana Rodriguez", "Carlos Mendoza", "Roberto Flores");
        List<String> apellidosClientesCre = List.of("Gomez", "Perez", "Vargas", "Mendoza", "Flores", "Rodriguez");
        List<Cliente> clientsCre = new ArrayList<>();
        Instant baseTimeCre = Instant.now().minus(90, ChronoUnit.DAYS);

        for (int i = 0; i < nombresClientesCre.size(); i++) {
            String name = nombresClientesCre.get(i);
            String lastName = apellidosClientesCre.get(i % apellidosClientesCre.size());
            Cliente cli = Cliente.builder()
                    .id("client-cre-" + i)
                    .tenantId(cre.getId())
                    .nombre(name)
                    .apellido(lastName)
                    .ci(String.valueOf(1000000 + i * 150000 + random.nextInt(10000)))
                    .correo(name.toLowerCase().replace(" ", "") + "@cre-client.com")
                    .telefono("+591 700" + (10000 + i))
                    .direccion("Santa Cruz, Bolivia")
                    .creadoEn(baseTimeCre.plus(random.nextInt(20), ChronoUnit.DAYS))
                    .build();
            clientsCre.add(clienteRepo.save(cli));
            
            // Create a user account for the first client to allow login testing
            if (i == 0) {
                crearUsuario(cli.getId() + "-usr", cre.getId(), cli.getNombre(), cli.getApellido(), cli.getCorreo(), "password123", RolUsuario.CLIENTE, "Cliente", "Externo", null, cli.getTelefono());
            }
        }

        // Generar historial de 60 trámites para CRE (Últimos 90 días)
        log.info("⚙️ Creando historial de trámites para CRE...");
        List<Usuario> funcsAtencionCre = List.of(funcJuan, funcAna);
        List<Usuario> funcsTecnicosCre = List.of(funcRoberto, funcLucia);

        for (int i = 1; i <= 60; i++) {
            boolean completado = (i <= 55);
            Cliente targetCli = clientsCre.get(random.nextInt(clientsCre.size()));
            String clienteFullNombre = targetCli.getNombre() + " " + targetCli.getApellido();
            Instant tramiteInicio = baseTimeCre.plus(random.nextInt(85), ChronoUnit.DAYS).plus(random.nextInt(24), ChronoUnit.HOURS);
            
            Tramite tramite = Tramite.builder()
                    .id("tramite-cre-" + i).politicaId(POLITICA_MEDIDOR_ID).tenantId(cre.getId())
                    .codigoSeguimiento("CRE-MED-" + (100000 + i)).clienteId(targetCli.getId())
                    .clienteNombre(clienteFullNombre).documentoCliente(targetCli.getCi())
                    .estado(completado ? EstadoTramite.COMPLETADO : EstadoTramite.EN_PROGRESO)
                    .creadoPor("seeder-cre").iniciadoEn(tramiteInicio).build();

            // Recepción
            Usuario uAt = funcsAtencionCre.get(random.nextInt(funcsAtencionCre.size()));
            Instant r1Fin = tramiteInicio.plus(random.nextInt(20) + 10, ChronoUnit.MINUTES);
            registroRepo.save(RegistroActividad.builder()
                    .id("reg-cre-r1-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_RECEPCION_ID)
                    .actividadNombre("Recepción de Solicitud").departamentoId(dAtencion.getId()).estado(EstadoRegistro.HECHO)
                    .ejecutadoPor(uAt.getNombre() + " " + uAt.getApellido()).ejecutadoPorId(uAt.getId()).asignadoEn(tramiteInicio).completadoEn(r1Fin).build());

            // Inspección (Cuello de botella)
            Usuario uTec = funcsTecnicosCre.get(random.nextInt(funcsTecnicosCre.size()));
            Instant r2Inicio = r1Fin.plus(random.nextInt(30) + 5, ChronoUnit.MINUTES);
            long duracionInspeccion = random.nextInt(300) + 180; // 3-8 horas
            Instant r2Fin = r2Inicio.plus(duracionInspeccion, ChronoUnit.MINUTES);
            
            registroRepo.save(RegistroActividad.builder()
                    .id("reg-cre-r2-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_INSPECCION_ID)
                    .actividadNombre("Inspección de Terreno").departamentoId(dOperaciones.getId())
                    .estado(completado ? EstadoRegistro.HECHO : EstadoRegistro.EN_PROGRESO)
                    .ejecutadoPor(uTec.getNombre() + " " + uTec.getApellido()).ejecutadoPorId(uTec.getId()).asignadoEn(r2Inicio).completadoEn(completado ? r2Fin : null).build());

            if (completado) {
                // Evaluación
                Instant r3Inicio = r2Fin.plus(5, ChronoUnit.MINUTES);
                Instant r3Fin = r3Inicio.plus(20, ChronoUnit.MINUTES);
                boolean aprobado = random.nextDouble() < 0.85;
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-cre-r3-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_EVALUACION_ID)
                        .actividadNombre("Evaluación Técnica").departamentoId(dOperaciones.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(uTec.getNombre() + " " + uTec.getApellido()).ejecutadoPorId(uTec.getId()).asignadoEn(r3Inicio).completadoEn(r3Fin).build());

                Instant finalTime = r3Fin;
                if (aprobado) {
                    // Presupuesto
                    Instant r4Inicio = r3Fin.plus(10, ChronoUnit.MINUTES);
                    Instant r4Fin = r4Inicio.plus(60, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-cre-r4-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_PRESUPUESTO_ID)
                            .actividadNombre("Cálculo de Presupuesto").departamentoId(dIT.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor("Sistema Financiero").ejecutadoPorId("system").asignadoEn(r4Inicio).completadoEn(r4Fin).build());

                    // Factura
                    Instant r5Inicio = r4Fin.plus(5, ChronoUnit.MINUTES);
                    Instant r5Fin = r5Inicio.plus(20, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-cre-r5-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_FACTURA_ID)
                            .actividadNombre("Emisión de Factura").departamentoId(dIT.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor("Sistema Financiero").ejecutadoPorId("system").asignadoEn(r5Inicio).completadoEn(r5Fin).build());

                    // Entrega
                    Instant r6Inicio = r5Fin.plus(15, ChronoUnit.MINUTES);
                    Instant r6Fin = r6Inicio.plus(10, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-cre-r6-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_ENTREGA_ID)
                            .actividadNombre("Entrega de Medidor").departamentoId(dAtencion.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uAt.getNombre() + " " + uAt.getApellido()).ejecutadoPorId(uAt.getId()).asignadoEn(r6Inicio).completadoEn(r6Fin).build());
                    
                    finalTime = r6Fin;
                } else {
                    // Entrega Notificación
                    Instant r6Inicio = r3Fin.plus(10, ChronoUnit.MINUTES);
                    Instant r6Fin = r6Inicio.plus(5, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-cre-r6-rechazo-" + i).tramiteId(tramite.getId()).tenantId(cre.getId()).actividadId(ACT_ENTREGA_ID)
                            .actividadNombre("Entrega de Medidor").departamentoId(dAtencion.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uAt.getNombre() + " " + uAt.getApellido()).ejecutadoPorId(uAt.getId()).asignadoEn(r6Inicio).completadoEn(r6Fin).build());
                    finalTime = r6Fin;
                }
                tramite.setFinalizadoEn(finalTime);
                tramite.setActualizadoEn(finalTime);
            }
            tramiteRepo.save(tramite);
        }

        // =========================================================================
        // SEEDER 2: SINERGIA TELECOMUNICACIONES S.A. (1 AÑO DE HISTORIAL - 120 CASOS)
        // =========================================================================
        Tenant sinergia = tenantRepo.save(Tenant.builder()
                .id(TENANT_SINERGIA_ID).nombre("Sinergia Telecomunicaciones S.A.")
                .nit("2040608090").direccion("Edificio Torres del Sol, Equipetrol").industria("Telecomunicaciones")
                .sitioWeb("https://www.sinergia.com.bo").telefonoInstitucional("+591 3 3889900")
                .emailContacto("soporte@sinergia.com.bo").lema("Conectando tu empresa al futuro.")
                .build());

        Cargo csGeneral = cargoRepo.save(Cargo.builder().tenantId(sinergia.getId()).nombre("Director General").codigo("S-DG").nivel("Directivo").salarioBase(18000.0).build());
        Cargo csVentas = cargoRepo.save(Cargo.builder().tenantId(sinergia.getId()).nombre("Ejecutivo de Cuentas Corporativas").codigo("S-VTA").nivel("Operativo").salarioBase(6000.0).build());
        Cargo csIngeniero = cargoRepo.save(Cargo.builder().tenantId(sinergia.getId()).nombre("Ingeniero de Proyectos FTTH").codigo("S-ING").nivel("Técnico").salarioBase(9000.0).build());
        Cargo csLogistica = cargoRepo.save(Cargo.builder().tenantId(sinergia.getId()).nombre("Jefe de Almacén y Distribución").codigo("S-LOG").nivel("Operativo").salarioBase(5000.0).build());
        Cargo csFacturacion = cargoRepo.save(Cargo.builder().tenantId(sinergia.getId()).nombre("Analista de Facturación").codigo("S-FAC").nivel("Operativo").salarioBase(4000.0).build());

        Departamento dsDireccion = departamentoRepo.save(Departamento.builder().id(DEPT_S_DIR_ID).tenantId(sinergia.getId()).nombre("Dirección General").codigo("S-DIR").presupuesto(900000.0).build());
        Departamento dsVentas = departamentoRepo.save(Departamento.builder().id(DEPT_S_VTA_ID).tenantId(sinergia.getId()).nombre("Ventas y Contratos").codigo("S-VTA").presupuesto(400000.0).build());
        Departamento dsIngenieria = departamentoRepo.save(Departamento.builder().id(DEPT_S_ING_ID).tenantId(sinergia.getId()).nombre("Ingeniería e Instalaciones").codigo("S-ING").presupuesto(1500000.0).build());
        Departamento dsLogistica = departamentoRepo.save(Departamento.builder().id(DEPT_S_LOG_ID).tenantId(sinergia.getId()).nombre("Logística y Almacén").codigo("S-LOG").presupuesto(600000.0).build());
        Departamento dsFacturacion = departamentoRepo.save(Departamento.builder().id(DEPT_S_FAC_ID).tenantId(sinergia.getId()).nombre("Facturación y Cobranzas").codigo("S-FAC").presupuesto(300000.0).build());

        Usuario sAdmin = crearUsuario(uid(), sinergia.getId(), "Roberto", "Gómez", "gerente@sinergia.com", "sinergia123", RolUsuario.ADMINISTRADOR, csGeneral.getNombre(), dsDireccion.getNombre(), dsDireccion.getId(), "+591 71010010");
        Usuario sDisenador = crearUsuario(uid(), sinergia.getId(), "Laura", "Benítez", "ventas@sinergia.com", "sinergia123", RolUsuario.DISENADOR, csVentas.getNombre(), dsVentas.getNombre(), dsVentas.getId(), "+591 71020020");
        Usuario sIng1 = crearUsuario(uid(), sinergia.getId(), "Esteban", "Cruz", "esteban@sinergia.com", "sinergia123", RolUsuario.FUNCIONARIO, csIngeniero.getNombre(), dsIngenieria.getNombre(), dsIngenieria.getId(), "+591 71030030");
        Usuario sIng2 = crearUsuario(uid(), sinergia.getId(), "Diana", "Flores", "diana@sinergia.com", "sinergia123", RolUsuario.FUNCIONARIO, csIngeniero.getNombre(), dsIngenieria.getNombre(), dsIngenieria.getId(), "+591 71040040");
        Usuario sLog = crearUsuario(uid(), sinergia.getId(), "Oscar", "Ortiz", "oscar@sinergia.com", "sinergia123", RolUsuario.FUNCIONARIO, csLogistica.getNombre(), dsLogistica.getNombre(), dsLogistica.getId(), "+591 71050050");
        Usuario sFact = crearUsuario(uid(), sinergia.getId(), "Patricia", "Apaza", "patricia@sinergia.com", "sinergia123", RolUsuario.FUNCIONARIO, csFacturacion.getNombre(), dsFacturacion.getNombre(), dsFacturacion.getId(), "+591 71060060");

        FormularioTemplate fts1 = templateRepo.save(FormularioTemplate.builder()
                .id(uid()).tenantId(sinergia.getId()).nombre("Requerimiento de Enlace Dedicado")
                .descripcion("Datos corporativos y ancho de banda solicitado.")
                .campos(List.of(
                        campo("clienteRazonSocial", "Razón Social Cliente", "text", true),
                        campo("anchoBandaMbps", "Ancho de Banda (Mbps)", "number", true),
                        campo("direccionEnlace", "Dirección Geográfica", "textarea", true)
                )).build());

        Proyecto proyectoSinergia = proyectoRepo.save(Proyecto.builder()
                .id(uid()).tenantId(sinergia.getId()).nombre("Proyectos de Conectividad Corporativa")
                .estado("ACTIVO").responsable(sDisenador.getNombre()).responsableId(sDisenador.getId())
                .build());

        // Flujo 1: Instalación de Enlace Dedicado
        PoliticaNegocio pDedicated = politicaRepo.save(PoliticaNegocio.builder()
                .id(POLITICA_ENLACE_ID).tenantId(sinergia.getId()).proyectoId(proyectoSinergia.getId())
                .nombre("Instalación de Enlace Dedicado")
                .descripcion("Flujo corporativo que abarca la factibilidad técnica de la fibra, el despacho de routers y modems en almacén, tendido e instalación de fibra óptica, pruebas de estabilidad, y emisión de la factura inicial.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Ventas Corporativas", dsVentas.getId(), 0, "#6366f1", List.of(
                                actividad(ACT_S_CONTRATO_ID, "Recepción de Contrato", TipoActividad.INICIO, true, false, 0),
                                actividad(ACT_S_ACTA_ID, "Acta de Entrega y Firma", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Ingeniería de Redes", dsIngenieria.getId(), 1, "#22c55e", List.of(
                                actividad(ACT_S_ESTUDIO_ID, "Estudio de Factibilidad Técnica", TipoActividad.TAREA, false, false, 0),
                                actividad(ACT_S_TENDIDO_ID, "Tendido y Fusión de Fibra", TipoActividad.TAREA, false, false, 1),
                                actividad(ACT_S_PRUEBAS_ID, "Pruebas de Conectividad y Estabilidad", TipoActividad.DECISION, false, false, 2)
                        )),
                        calle("Logística", dsLogistica.getId(), 2, "#f97316", List.of(
                                actividad(ACT_S_DESPACHO_ID, "Despacho de Equipos de Red", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Facturación", dsFacturacion.getId(), 3, "#ec4899", List.of(
                                actividad(ACT_S_FACTURACION_ID, "Emisión de Factura Inicial", TipoActividad.TAREA, false, false, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(ACT_S_CONTRATO_ID, ACT_S_ESTUDIO_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_ESTUDIO_ID, ACT_S_DESPACHO_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_DESPACHO_ID, ACT_S_TENDIDO_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_TENDIDO_ID, ACT_S_PRUEBAS_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_PRUEBAS_ID, ACT_S_ACTA_ID, TipoRuta.CONDICIONAL, "Aprobado - Enlace Estable"),
                        transicion(ACT_S_PRUEBAS_ID, ACT_S_TENDIDO_ID, TipoRuta.CONDICIONAL, "Rechazado - Renuencia o Fusión Débil"),
                        transicion(ACT_S_ACTA_ID, ACT_S_FACTURACION_ID, TipoRuta.SECUENCIAL, "")
                ))
                .build());

        // Flujo 2: Soporte Técnico de Enlaces
        PoliticaNegocio pSupport = politicaRepo.save(PoliticaNegocio.builder()
                .id(POLITICA_SOPORTE_ID).tenantId(sinergia.getId()).proyectoId(proyectoSinergia.getId())
                .nombre("Soporte Técnico de Enlaces")
                .descripcion("Flujo para la atención de incidentes críticos en la conectividad del cliente. Incluye diagnóstico remoto, reparación física en campo si es necesario, y validación del SLA.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Soporte y Ventas", dsVentas.getId(), 0, "#6366f1", List.of(
                                actividad(ACT_S_SOP_TICKET_ID, "Recepción de Ticket de Soporte", TipoActividad.INICIO, true, false, 0),
                                actividad(ACT_S_SOP_CIERRE_ID, "Cierre de Ticket", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Ingeniería de Redes", dsIngenieria.getId(), 1, "#22c55e", List.of(
                                actividad(ACT_S_SOP_DIAG_ID, "Diagnóstico Remoto", TipoActividad.TAREA, false, false, 0),
                                actividad(ACT_S_SOP_CAMPO_DEC_ID, "Evaluación de Visita de Campo", TipoActividad.DECISION, false, false, 1),
                                actividad(ACT_S_SOP_VALIDAR_ID, "Validación de Estabilidad", TipoActividad.TAREA, false, false, 2)
                        )),
                        calle("Logística y Campo", dsLogistica.getId(), 2, "#f97316", List.of(
                                actividad(ACT_S_SOP_VISITA_ID, "Reparación y Fusión en Terreno", TipoActividad.TAREA, false, false, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(ACT_S_SOP_TICKET_ID, ACT_S_SOP_DIAG_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_SOP_DIAG_ID, ACT_S_SOP_CAMPO_DEC_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_SOP_CAMPO_DEC_ID, ACT_S_SOP_VISITA_ID, TipoRuta.CONDICIONAL, "Requiere Visita de Campo"),
                        transicion(ACT_S_SOP_CAMPO_DEC_ID, ACT_S_SOP_VALIDAR_ID, TipoRuta.CONDICIONAL, "Solución Remota"),
                        transicion(ACT_S_SOP_VISITA_ID, ACT_S_SOP_VALIDAR_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_SOP_VALIDAR_ID, ACT_S_SOP_CIERRE_ID, TipoRuta.SECUENCIAL, "")
                ))
                .build());

        // Flujo 3: Renovación de Contratos Corporativos
        PoliticaNegocio pRenewal = politicaRepo.save(PoliticaNegocio.builder()
                .id(POLITICA_RENOVACION_ID).tenantId(sinergia.getId()).proyectoId(proyectoSinergia.getId())
                .nombre("Renovación de Contratos Corporativos")
                .descripcion("Proceso administrativo y de redes para renovar contratos anuales de enlaces dedicados o solicitar upgrades de ancho de banda.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Ventas Corporativas", dsVentas.getId(), 0, "#6366f1", List.of(
                                actividad(ACT_S_REN_SOLICITUD_ID, "Recepción de Solicitud de Renovación", TipoActividad.INICIO, true, false, 0),
                                actividad(ACT_S_REN_CIERRE_ID, "Cierre de Renovación", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Facturación y Cobros", dsFacturacion.getId(), 1, "#ec4899", List.of(
                                actividad(ACT_S_REN_EVAL_FIN_ID, "Evaluación Crediticia y Tarifario", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Dirección General", dsDireccion.getId(), 2, "#e2e8f0", List.of(
                                actividad(ACT_S_REN_FIRMA_ID, "Revisión y Firma de Documento", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Ingeniería de Redes", dsIngenieria.getId(), 3, "#22c55e", List.of(
                                actividad(ACT_S_REN_APROB_TEC_ID, "Aprobación de Capacidad de Red", TipoActividad.TAREA, false, false, 0),
                                actividad(ACT_S_REN_RECONFIG_ID, "Reconfiguración de Ancho de Banda", TipoActividad.TAREA, false, false, 1)
                        ))
                ))
                .transiciones(List.of(
                        transicion(ACT_S_REN_SOLICITUD_ID, ACT_S_REN_EVAL_FIN_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_REN_EVAL_FIN_ID, ACT_S_REN_APROB_TEC_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_REN_APROB_TEC_ID, ACT_S_REN_FIRMA_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_REN_FIRMA_ID, ACT_S_REN_RECONFIG_ID, TipoRuta.SECUENCIAL, ""),
                        transicion(ACT_S_REN_RECONFIG_ID, ACT_S_REN_CIERRE_ID, TipoRuta.SECUENCIAL, "")
                ))
                .build());

        // Seeder de Clientes Sinergia (10 clientes premium corporativos)
        log.info("⚙️ Creando clientes de base de datos para Sinergia...");
        List<String> clientesSinergia = List.of(
                "Banco Mercantil", "Universidad Mayor", "Clinica Foianini", "Hoteles Camino Real", "Supermercados Fidalga",
                "Hipermaxi S.A.", "Tigo Casa", "Minera San Cristóbal", "Constructora El Doral", "Saguapac SRL"
        );
        List<Cliente> clientsSin = new ArrayList<>();
        Instant baseTimeSinergia = Instant.now().minus(365, ChronoUnit.DAYS); // 1 año atrás

        for (int i = 0; i < clientesSinergia.size(); i++) {
            String compName = clientesSinergia.get(i);
            Cliente cli = Cliente.builder()
                    .id("client-sinergia-" + i)
                    .tenantId(sinergia.getId())
                    .nombre(compName)
                    .apellido("")
                    .ci("NIT-" + (2000000 + i * 85000 + random.nextInt(10000)))
                    .correo(compName.toLowerCase().replace(" ", "").replace(".", "") + "@sinergia-client.com")
                    .telefono("+591 710" + (10000 + i))
                    .direccion("Santa Cruz, Bolivia")
                    .creadoEn(baseTimeSinergia.plus(random.nextInt(30), ChronoUnit.DAYS))
                    .build();
            clientsSin.add(clienteRepo.save(cli));
        }

        // Generar historial de 1 AÑO (120 trámites para Sinergia Telecom)
        log.info("⚙️ Generando historial de 1 año (120 trámites) para Sinergia...");
        List<Usuario> ingesSinergia = List.of(sIng1, sIng2);

        for (int k = 1; k <= 120; k++) {
            // Distribuir el estado (116 completados, 4 en progreso)
            boolean completado = (k <= 116);
            Cliente targetCli = clientsSin.get(random.nextInt(clientsSin.size()));
            String clienteFullNombre = targetCli.getNombre();
            
            // Distribuir de forma uniforme en los 365 días (aprox. 1 trámite cada 3 días)
            Instant tramiteInicio = baseTimeSinergia.plus(k * 3, ChronoUnit.DAYS)
                    .plus(random.nextInt(24), ChronoUnit.HOURS)
                    .plus(random.nextInt(60), ChronoUnit.MINUTES);

            if (k <= 60) {
                // --- FLOW 1: ENLACE DEDICADO ---
                Tramite tramite = Tramite.builder()
                        .id("tramite-sinergia-" + k).politicaId(POLITICA_ENLACE_ID).tenantId(sinergia.getId())
                        .codigoSeguimiento("SIN-LINK-" + (5000 + k)).clienteId(targetCli.getId())
                        .clienteNombre(clienteFullNombre).documentoCliente(targetCli.getCi())
                        .estado(completado ? EstadoTramite.COMPLETADO : EstadoTramite.EN_PROGRESO)
                        .creadoPor("seeder-sinergia").iniciadoEn(tramiteInicio).build();

                // 1. Recepción de Contrato (Laura Benítez - Ventas)
                Instant r1Fin = tramiteInicio.plus(random.nextInt(60) + 30, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-r1-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_CONTRATO_ID)
                        .actividadNombre("Recepción de Contrato").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                        .asignadoEn(tramiteInicio).completadoEn(r1Fin).build());

                // 2. Estudio de Factibilidad (BOTTLE-NECK INGENIERÍA) -> ¡Toma entre 2 y 5 días!
                Usuario uIng = ingesSinergia.get(random.nextInt(ingesSinergia.size()));
                Instant r2Inicio = r1Fin.plus(random.nextInt(60) + 10, ChronoUnit.MINUTES);
                long duracionEstudio = random.nextInt(4320) + 2880; // 48 a 120 horas
                Instant r2Fin = r2Inicio.plus(duracionEstudio, ChronoUnit.MINUTES);
                
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-r2-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_ESTUDIO_ID)
                        .actividadNombre("Estudio de Factibilidad Técnica").departamentoId(dsIngenieria.getId())
                        .estado(completado ? EstadoRegistro.HECHO : EstadoRegistro.EN_PROGRESO)
                        .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                        .asignadoEn(r2Inicio).completadoEn(completado ? r2Fin : null).build());

                if (completado) {
                    // 3. Despacho de Equipos (Oscar Ortiz - Logística)
                    Instant r3Inicio = r2Fin.plus(random.nextInt(120) + 10, ChronoUnit.MINUTES);
                    Instant r3Fin = r3Inicio.plus(random.nextInt(90) + 30, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-r3-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_DESPACHO_ID)
                            .actividadNombre("Despacho de Equipos de Red").departamentoId(dsLogistica.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(sLog.getNombre() + " " + sLog.getApellido()).ejecutadoPorId(sLog.getId())
                            .asignadoEn(r3Inicio).completadoEn(r3Fin).build());

                    // 4. Tendido y Fusión (Ingeniero)
                    Instant r4Inicio = r3Fin.plus(random.nextInt(60) + 10, ChronoUnit.MINUTES);
                    long duracionTendido = random.nextInt(360) + 360; // 6 a 12 horas
                    Instant r4Fin = r4Inicio.plus(duracionTendido, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-r4-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_TENDIDO_ID)
                            .actividadNombre("Tendido y Fusión de Fibra").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                            .asignadoEn(r4Inicio).completadoEn(r4Fin).build());

                    // 5. Pruebas de Conectividad (Ingeniero)
                    Instant r5Inicio = r4Fin.plus(15, ChronoUnit.MINUTES);
                    Instant r5Fin = r5Inicio.plus(60, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-r5-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_PRUEBAS_ID)
                            .actividadNombre("Pruebas de Conectividad y Estabilidad").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                            .asignadoEn(r5Inicio).completadoEn(r5Fin).build());

                    // 6. Acta de Entrega (Ventas)
                    Instant r6Inicio = r5Fin.plus(random.nextInt(240) + 60, ChronoUnit.MINUTES);
                    Instant r6Fin = r6Inicio.plus(120, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-r6-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_ACTA_ID)
                            .actividadNombre("Acta de Entrega y Firma").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                            .asignadoEn(r6Inicio).completadoEn(r6Fin).build());

                    // 7. Facturación (Patricia Apaza)
                    Instant r7Inicio = r6Fin.plus(random.nextInt(60) + 15, ChronoUnit.MINUTES);
                    Instant r7Fin = r7Inicio.plus(45, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-r7-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_FACTURACION_ID)
                            .actividadNombre("Emisión de Factura Inicial").departamentoId(dsFacturacion.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(sFact.getNombre() + " " + sFact.getApellido()).ejecutadoPorId(sFact.getId())
                            .asignadoEn(r7Inicio).completadoEn(r7Fin).build());

                    tramite.setFinalizadoEn(r7Fin);
                    tramite.setActualizadoEn(r7Fin);
                }
                tramiteRepo.save(tramite);

            } else if (k <= 100) {
                // --- FLOW 2: SOPORTE TÉCNICO ---
                // 36 completados en este bloque (k=61..96 completados, 97..100 en progreso)
                boolean sopCompletado = (k <= 96);
                
                Tramite tramite = Tramite.builder()
                        .id("tramite-sinergia-" + k).politicaId(POLITICA_SOPORTE_ID).tenantId(sinergia.getId())
                        .codigoSeguimiento("SIN-SUP-" + (3000 + k)).clienteId(targetCli.getId())
                        .clienteNombre(clienteFullNombre).documentoCliente(targetCli.getCi())
                        .estado(sopCompletado ? EstadoTramite.COMPLETADO : EstadoTramite.EN_PROGRESO)
                        .creadoPor("seeder-sinergia").iniciadoEn(tramiteInicio).build();

                // 1. Recepción de Ticket
                Instant r1Fin = tramiteInicio.plus(random.nextInt(20) + 10, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-sop1-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_TICKET_ID)
                        .actividadNombre("Recepción de Ticket de Soporte").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                        .asignadoEn(tramiteInicio).completadoEn(r1Fin).build());

                // 2. Diagnóstico Remoto
                Usuario uIng = ingesSinergia.get(random.nextInt(ingesSinergia.size()));
                Instant r2Inicio = r1Fin.plus(random.nextInt(30) + 5, ChronoUnit.MINUTES);
                Instant r2Fin = r2Inicio.plus(random.nextInt(60) + 30, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-sop2-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_DIAG_ID)
                        .actividadNombre("Diagnóstico Remoto").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                        .asignadoEn(r2Inicio).completadoEn(r2Fin).build());

                // 3. Decisión
                Instant r3Inicio = r2Fin.plus(5, ChronoUnit.MINUTES);
                Instant r3Fin = r3Inicio.plus(10, ChronoUnit.MINUTES);
                boolean requiereVisita = random.nextDouble() < 0.75;
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-sop3-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_CAMPO_DEC_ID)
                        .actividadNombre("Evaluación de Visita de Campo").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                        .asignadoEn(r3Inicio).completadoEn(r3Fin).build());

                Instant currentPoint = r3Fin;
                if (requiereVisita) {
                    // 4. Visita de Campo (CUELLO DE BOTELLA TÉCNICO) -> 4 a 12 horas (240 a 720 mins)
                    Instant r4Inicio = currentPoint.plus(random.nextInt(60) + 15, ChronoUnit.MINUTES);
                    long duracionVisita = random.nextInt(480) + 240;
                    Instant r4Fin = r4Inicio.plus(duracionVisita, ChronoUnit.MINUTES);
                    
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-sop4-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_VISITA_ID)
                            .actividadNombre("Reparación y Fusión en Terreno").departamentoId(dsLogistica.getId())
                            .estado(sopCompletado ? EstadoRegistro.HECHO : EstadoRegistro.EN_PROGRESO)
                            .ejecutadoPor(sLog.getNombre() + " " + sLog.getApellido()).ejecutadoPorId(sLog.getId())
                            .asignadoEn(r4Inicio).completadoEn(sopCompletado ? r4Fin : null).build());
                    currentPoint = r4Fin;
                }

                if (sopCompletado) {
                    // 5. Validación
                    Instant r5Inicio = currentPoint.plus(10, ChronoUnit.MINUTES);
                    Instant r5Fin = r5Inicio.plus(random.nextInt(40) + 20, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-sop5-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_VALIDAR_ID)
                            .actividadNombre("Validación de Estabilidad").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                            .asignadoEn(r5Inicio).completadoEn(r5Fin).build());

                    // 6. Cierre
                    Instant r6Inicio = r5Fin.plus(10, ChronoUnit.MINUTES);
                    Instant r6Fin = r6Inicio.plus(15, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-sop6-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_SOP_CIERRE_ID)
                            .actividadNombre("Cierre de Ticket").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                            .asignadoEn(r6Inicio).completadoEn(r6Fin).build());

                    tramite.setFinalizadoEn(r6Fin);
                    tramite.setActualizadoEn(r6Fin);
                }
                tramiteRepo.save(tramite);

            } else {
                // --- FLOW 3: RENOVACIÓN DE CONTRATOS ---
                // 18 completados en este bloque (k=101..118 completados, 119..120 en progreso)
                boolean renCompletado = (k <= 118);
                
                Tramite tramite = Tramite.builder()
                        .id("tramite-sinergia-" + k).politicaId(POLITICA_RENOVACION_ID).tenantId(sinergia.getId())
                        .codigoSeguimiento("SIN-REN-" + (2000 + k)).clienteId(targetCli.getId())
                        .clienteNombre(clienteFullNombre).documentoCliente(targetCli.getCi())
                        .estado(renCompletado ? EstadoTramite.COMPLETADO : EstadoTramite.EN_PROGRESO)
                        .creadoPor("seeder-sinergia").iniciadoEn(tramiteInicio).build();

                // 1. Recepción Solicitud
                Instant r1Fin = tramiteInicio.plus(random.nextInt(30) + 30, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-ren1-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_SOLICITUD_ID)
                        .actividadNombre("Recepción de Solicitud de Renovación").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                        .asignadoEn(tramiteInicio).completadoEn(r1Fin).build());

                // 2. Evaluación Financiera
                Instant r2Inicio = r1Fin.plus(random.nextInt(60) + 10, ChronoUnit.MINUTES);
                Instant r2Fin = r2Inicio.plus(random.nextInt(120) + 60, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-ren2-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_EVAL_FIN_ID)
                        .actividadNombre("Evaluación Crediticia y Tarifario").departamentoId(dsFacturacion.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(sFact.getNombre() + " " + sFact.getApellido()).ejecutadoPorId(sFact.getId())
                        .asignadoEn(r2Inicio).completadoEn(r2Fin).build());

                // 3. Aprobación Técnica
                Usuario uIng = ingesSinergia.get(random.nextInt(ingesSinergia.size()));
                Instant r3Inicio = r2Fin.plus(random.nextInt(60) + 10, ChronoUnit.MINUTES);
                Instant r3Fin = r3Inicio.plus(random.nextInt(60) + 60, ChronoUnit.MINUTES);
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-ren3-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_APROB_TEC_ID)
                        .actividadNombre("Aprobación de Capacidad de Red").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                        .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                        .asignadoEn(r3Inicio).completadoEn(r3Fin).build());

                // 4. Firma de Addenda (CUELLO DE BOTELLA ADMINISTRATIVO) -> 1 a 3 días (1440 a 4320 mins)
                Instant r4Inicio = r3Fin.plus(random.nextInt(120) + 30, ChronoUnit.MINUTES);
                long duracionFirma = random.nextInt(2880) + 1440;
                Instant r4Fin = r4Inicio.plus(duracionFirma, ChronoUnit.MINUTES);
                
                registroRepo.save(RegistroActividad.builder()
                        .id("reg-sin-ren4-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_FIRMA_ID)
                        .actividadNombre("Revisión y Firma de Documento").departamentoId(dsDireccion.getId())
                        .estado(renCompletado ? EstadoRegistro.HECHO : EstadoRegistro.EN_PROGRESO)
                        .ejecutadoPor(sAdmin.getNombre() + " " + sAdmin.getApellido()).ejecutadoPorId(sAdmin.getId())
                        .asignadoEn(r4Inicio).completadoEn(renCompletado ? r4Fin : null).build());

                if (renCompletado) {
                    // 5. Reconfiguración Lógica
                    Instant r5Inicio = r4Fin.plus(15, ChronoUnit.MINUTES);
                    Instant r5Fin = r5Inicio.plus(30, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-ren5-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_RECONFIG_ID)
                            .actividadNombre("Reconfiguración de Ancho de Banda").departamentoId(dsIngenieria.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(uIng.getNombre() + " " + uIng.getApellido()).ejecutadoPorId(uIng.getId())
                            .asignadoEn(r5Inicio).completadoEn(r5Fin).build());

                    // 6. Cierre
                    Instant r6Inicio = r5Fin.plus(10, ChronoUnit.MINUTES);
                    Instant r6Fin = r6Inicio.plus(15, ChronoUnit.MINUTES);
                    registroRepo.save(RegistroActividad.builder()
                            .id("reg-sin-ren6-" + k).tramiteId(tramite.getId()).tenantId(sinergia.getId()).actividadId(ACT_S_REN_CIERRE_ID)
                            .actividadNombre("Cierre de Renovación").departamentoId(dsVentas.getId()).estado(EstadoRegistro.HECHO)
                            .ejecutadoPor(sDisenador.getNombre() + " " + sDisenador.getApellido()).ejecutadoPorId(sDisenador.getId())
                            .asignadoEn(r6Inicio).completadoEn(r6Fin).build());

                    tramite.setFinalizadoEn(r6Fin);
                    tramite.setActualizadoEn(r6Fin);
                }
                tramiteRepo.save(tramite);
            }
        }

        // =========================================================================
        // SEEDER 3: AUDITORÍA CRUZADA (CRE Y SINERGIA) - 450+ REGISTROS
        // =========================================================================
        log.info("⚙️ Generando 450+ registros de auditoría distribuidos temporalmente...");

        // Auditoría para CRE (150 registros)
        List<Usuario> usersCre = List.of(adminCre, disenadorCre, funcJuan, funcAna, funcRoberto, funcLucia);
        List<String> accs = List.of("LOGIN", "LOGOUT", "INICIAR_TRAMITE", "COMPLETAR_ACTIVIDAD", "EDITAR_PROYECTO", "CREAR_USUARIO");
        List<String> ents = List.of("Usuario", "Tramite", "RegistroActividad", "Proyecto", "FormularioTemplate");

        for (int a = 1; a <= 150; a++) {
            Usuario u = usersCre.get(random.nextInt(usersCre.size()));
            String acc = accs.get(random.nextInt(accs.size()));
            String ent = ents.get(random.nextInt(ents.size()));
            Instant ts = baseTimeCre.plus(random.nextInt(85), ChronoUnit.DAYS).plus(random.nextInt(24), ChronoUnit.HOURS);
            
            auditRepo.save(AuditLog.builder()
                    .id("audit-cre-" + a).tenantId(cre.getId()).usuarioId(u.getId()).usuarioNombre(u.getNombre() + " " + u.getApellido())
                    .accion(acc).entidad(ent).entidadId(UUID.randomUUID().toString())
                    .detalle("Auditoría CRE: Usuario realizo la acción '" + acc + "' en " + ent)
                    .timestamp(ts).build());
        }

        // Auditoría para Sinergia (300 registros a lo largo del año)
        List<Usuario> usersSin = List.of(sAdmin, sDisenador, sIng1, sIng2, sLog, sFact);
        for (int b = 1; b <= 300; b++) {
            Usuario u = usersSin.get(random.nextInt(usersSin.size()));
            String acc = accs.get(random.nextInt(accs.size()));
            String ent = ents.get(random.nextInt(ents.size()));
            
            // Distribuir en el año de forma aleatoria
            Instant ts = baseTimeSinergia.plus(random.nextInt(360), ChronoUnit.DAYS).plus(random.nextInt(24), ChronoUnit.HOURS);

            auditRepo.save(AuditLog.builder()
                    .id("audit-sin-" + b).tenantId(sinergia.getId()).usuarioId(u.getId()).usuarioNombre(u.getNombre() + " " + u.getApellido())
                    .accion(acc).entidad(ent).entidadId(UUID.randomUUID().toString())
                    .detalle("Auditoría Sinergia: " + u.getNombre() + " ejecutó " + acc + " sobre " + ent + ".")
                    .timestamp(ts).build());
        }

        log.info("🎉 MEGA SEEDER COMPLETADO CON ÉXITO.");
        log.info("📊 CRE: 60 Trámites, 150 Audit logs.");
        log.info("📊 Sinergia Telecom: 120 Trámites (Historial 1 año), 300 Audit logs.");

        // Disparar entrenamiento de TensorFlow en el microservicio Python
        try {
            log.info("🧠 Solicitando re-entrenamiento de TensorFlow al microservicio Python...");
            restTemplate.postForEntity(aiMicroserviceUrl + "/api/ai/ml/train", null, String.class);
            log.info("✅ Re-entrenamiento de TensorFlow completado con éxito.");
        } catch (Exception e) {
            log.warn("⚠️ No se pudo disparar el entrenamiento de TensorFlow: {}", e.getMessage());
        }
    }

    private String uid() { return UUID.randomUUID().toString(); }

    private Usuario crearUsuario(String id, String tenantId, String nombre, String apellido, String email, String password, RolUsuario rol, String cargo, String depto, String deptoId, String telf) {
        String clienteId = null;
        if (rol == RolUsuario.CLIENTE) {
            if (id.endsWith("-usr")) {
                clienteId = id.substring(0, id.length() - 4);
            } else {
                clienteId = id;
            }
        }
        Usuario u = Usuario.builder()
                .id(id).tenantId(tenantId).nombre(nombre).apellido(apellido).email(email)
                .password(passwordEncoder.encode(password)).rol(rol).cargo(cargo).departamento(depto)
                .departamentoId(deptoId).telefono(telf).activo(true).creadoEn(Instant.now().minus(370, ChronoUnit.DAYS))
                .clienteId(clienteId)
                .build();
        return usuarioRepo.save(u);
    }

    private Actividad actividad(String id, String nombre, TipoActividad tipo, boolean esInicial, boolean esFinal, int orden) {
        return Actividad.builder().id(id).nombre(nombre).tipo(tipo).esInicial(esInicial).esFinal(esFinal).orden(orden).build();
    }

    private Calle calle(String nombre, String deptoId, int orden, String color, List<Actividad> actividades) {
        return Calle.builder().id(uid()).nombre(nombre).departamentoId(deptoId).orden(orden).color(color).actividades(new ArrayList<>(actividades)).build();
    }

    private Transicion transicion(String origenId, String destinoId, TipoRuta tipo, String etiqueta) {
        return Transicion.builder().id(uid()).origenId(origenId).destinoId(destinoId)
                .tipoRuta(tipo).etiqueta(etiqueta != null ? etiqueta : "").prioridad(0).build();
    }

    private FormularioTemplate.CampoFormulario campo(String key, String label, String type, boolean req) {
        return FormularioTemplate.CampoFormulario.builder().key(key).label(label).type(type).required(req).build();
    }

    private FormularioTemplate.CampoFormulario campo(String key, String label, String type, boolean req, List<String> opts) {
        return FormularioTemplate.CampoFormulario.builder().key(key).label(label).type(type).required(req).options(opts).build();
    }
}

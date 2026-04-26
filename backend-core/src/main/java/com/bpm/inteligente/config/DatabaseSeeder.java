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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private final ProyectoRepository proyectoRepo;
    private final CargoRepository cargoRepo;
    private final DepartamentoRepository departamentoRepo;
    private final FormularioTemplateRepository templateRepo;
    private final TramiteRepository tramiteRepo;

    // IDs Fijos para consistencia en pruebas
    private static final String TENANT_CRE_ID = "f68512a1-95e3-4133-9571-84147ea8e10b";
    private static final String ADMIN_CRE_ID = "a1111111-1111-1111-1111-111111111111";
    private static final String DISENADOR_CRE_ID = "d2222222-2222-2222-2222-222222222222";
    private static final String FUNC_JUAN_ID = "j3333333-3333-3333-3333-333333333333";
    private static final String DEPT_GER_ID = "de111111-1111-1111-1111-111111111111";
    private static final String DEPT_IT_ID = "de222222-2222-2222-2222-222222222222";
    private static final String DEPT_OPE_ID = "de333333-3333-3333-3333-333333333333";
    private static final String DEPT_ATC_ID = "de444444-4444-4444-4444-444444444444";

    @Override
    public void run(String... args) {
        log.info("🌱 Iniciando seeder masivo de datos de prueba...");

        if (tenantRepo.count() > 0) {
            log.info("🌱 Seeder: Datos ya existen. Saltando seeder masivo...");
            return;
        }

        // Limpiar datos existentes
        registroRepo.deleteAll();
        politicaRepo.deleteAll();
        proyectoRepo.deleteAll();
        usuarioRepo.deleteAll();
        cargoRepo.deleteAll();
        departamentoRepo.deleteAll();
        tenantRepo.deleteAll();
        templateRepo.deleteAll();
        tramiteRepo.deleteAll();
        log.info("🧹 Datos previos eliminados.");

        // ══════════════════════════════════════════════════════
        // TENANT 1: CRE
        // ══════════════════════════════════════════════════════
        Tenant cre = tenantRepo.save(Tenant.builder()
                .id(TENANT_CRE_ID).nombre("CRE - Cooperativa Eléctrica")
                .nit("1020304050").direccion("Av. Busch esq. 2do Anillo").industria("Servicios Públicos")
                .sitioWeb("https://www.cre.com.bo").telefonoInstitucional("+591 3 3366666")
                .emailContacto("contacto@cre.com.bo").lema("Iluminando el desarrollo regional.")
                .build());

        Cargo c1 = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Gerente General").codigo("GG-01").nivel("Directivo").salarioBase(15000.0)
                .atributosExtra(List.of(new AtributoExtra("Bonificación", "Número", "2000"), new AtributoExtra("Vehículo", "Texto", "Asignado")))
                .build());
        Cargo c2 = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Analista de Sistemas").codigo("IT-01").nivel("Técnico").salarioBase(8500.0)
                .atributosExtra(List.of(new AtributoExtra("Certificaciones", "Texto", "AWS, Azure")))
                .build());
        Cargo c3 = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Atención al Cliente").codigo("ATC-01").nivel("Operativo").salarioBase(4500.0).build());
        Cargo c4 = cargoRepo.save(Cargo.builder().tenantId(cre.getId()).nombre("Técnico Electricista").codigo("TEC-01").nivel("Operativo").salarioBase(5500.0).build());

        Departamento d1 = departamentoRepo.save(Departamento.builder().id(DEPT_GER_ID).tenantId(cre.getId()).nombre("Gerencia").codigo("DEP-GER").ubicacion("P5").presupuesto(500000.0)
                .atributosExtra(List.of(new AtributoExtra("Objetivo Q2", "Texto", "Expansión Regional")))
                .build());
        Departamento d2 = departamentoRepo.save(Departamento.builder().id(DEPT_IT_ID).tenantId(cre.getId()).nombre("IT").codigo("DEP-IT").ubicacion("P3").presupuesto(1200000.0)
                .atributosExtra(List.of(new AtributoExtra("Servidores", "Número", "12")))
                .build());
        Departamento d3 = departamentoRepo.save(Departamento.builder().id(DEPT_OPE_ID).tenantId(cre.getId()).nombre("Operaciones").codigo("DEP-OPE").ubicacion("PB").presupuesto(800000.0).build());
        Departamento d4 = departamentoRepo.save(Departamento.builder().id(DEPT_ATC_ID).tenantId(cre.getId()).nombre("Atención").codigo("DEP-ATC").ubicacion("PB").presupuesto(300000.0).build());

        Usuario adminCre = crearUsuario(cre.getId(), "Carlos", "Mendoza", "admin@cre.com", "admin123", RolUsuario.ADMINISTRADOR, c1.getNombre(), d1.getNombre(), d1.getId(), "+591 70010010");
        adminCre.setId(ADMIN_CRE_ID); usuarioRepo.save(adminCre);

        Usuario disenadorCre = crearUsuario(cre.getId(), "María", "García", "diseno@cre.com", "diseno123", RolUsuario.DISENADOR, c2.getNombre(), d2.getNombre(), d2.getId(), "+591 70020020");
        disenadorCre.setId(DISENADOR_CRE_ID); usuarioRepo.save(disenadorCre);

        Usuario funcCre1 = crearUsuario(cre.getId(), "Juan", "Pérez", "juan@cre.com", "func123", RolUsuario.FUNCIONARIO, c3.getNombre(), d4.getNombre(), d4.getId(), "+591 70030030");
        funcCre1.setId(FUNC_JUAN_ID); usuarioRepo.save(funcCre1);

        Usuario funcCre2 = usuarioRepo.save(crearUsuario(cre.getId(), "Ana", "Rodríguez", "ana@cre.com", "func123", RolUsuario.FUNCIONARIO, c3.getNombre(), d4.getNombre(), d4.getId(), "+591 70040040"));
        Usuario funcCre3 = usuarioRepo.save(crearUsuario(cre.getId(), "Roberto", "Flores", "roberto@cre.com", "func123", RolUsuario.FUNCIONARIO, c4.getNombre(), d3.getNombre(), d3.getId(), "+591 70050050"));
        Usuario funcCre4 = usuarioRepo.save(crearUsuario(cre.getId(), "Lucía", "Vargas", "lucia@cre.com", "func123", RolUsuario.FUNCIONARIO, c4.getNombre(), d3.getNombre(), d3.getId(), "+591 70060060"));

        // Forms CRE
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

        PoliticaNegocio p1 = crearPoliticaInstalacionMedidor(cre.getId(), proyectoCre.getId(), d4.getId(), d3.getId(), d2.getId());
        p1.getCalles().get(0).getActividades().get(0).setPlantillaId(ft1.getId());
        p1.getCalles().get(0).getActividades().get(0).setEsquemaFormulario(Map.of("fields", ft1.getCampos()));
        politicaRepo.save(p1);

        PoliticaNegocio p2 = crearPoliticaReclamo(cre.getId(), proyectoCre.getId(), d3.getId(), d4.getId());
        PoliticaNegocio p3 = crearPoliticaCambioTitular(cre.getId(), proyectoCre.getId(), d4.getId(), d1.getId(), d2.getId());

        // Politica "Prueba Flujo" (Manual creation requested by user)
        String pa1 = uid(), pa2 = uid(), pa3 = uid();
        PoliticaNegocio pf = politicaRepo.save(PoliticaNegocio.builder()
                .id("69ed86e6b0938806552706c7").tenantId(cre.getId()).proyectoId(proyectoCre.getId())
                .nombre("Prueba Flujo").descripcion("Flujo de prueba para validaciones y auditoría.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Atención", DEPT_ATC_ID, 0, "#6366f1", List.of(
                                actividad(pa1, "Inicio de Prueba", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Operaciones", DEPT_OPE_ID, 1, "#22c55e", List.of(
                                actividad(pa2, "Validación de Datos", TipoActividad.TAREA, false, false, 0),
                                actividad(pa3, "Fin de Prueba", TipoActividad.FIN, false, true, 1)
                        ))
                ))
                .transiciones(List.of(
                        transicion(pa1, pa2, TipoRuta.SECUENCIAL, ""),
                        transicion(pa2, pa3, TipoRuta.SECUENCIAL, "")
                ))
                .build());

        // Trámites CRE
        // Trámite 1: En progreso (tomado por Juan)
        Tramite t1 = tramiteService.iniciar(p1.getId(), funcCre1.getId());
        t1.setEstado(EstadoTramite.EN_PROGRESO);
        tramiteRepo.save(t1);
        List<RegistroActividad> regsT1 = registroRepo.findByTramiteId(t1.getId());
        if (!regsT1.isEmpty()) {
            RegistroActividad r = regsT1.get(0);
            r.setAsignadoEn(Instant.now().minus(3, ChronoUnit.HOURS)); // Cuello de botella simulado
            r.setEjecutadoPor(funcCre1.getNombre() + " " + funcCre1.getApellido());
            r.setEjecutadoPorId(funcCre1.getId());
            registroRepo.save(r);
        }

        // Trámite 2: En progreso (tomado por Ana)
        Tramite t2 = tramiteService.iniciar(p1.getId(), funcCre2.getId());
        t2.setEstado(EstadoTramite.EN_PROGRESO);
        tramiteRepo.save(t2);
        List<RegistroActividad> regsT2 = registroRepo.findByTramiteId(t2.getId());
        if (!regsT2.isEmpty()) {
            RegistroActividad r = regsT2.get(0);
            r.setAsignadoEn(Instant.now().minus(10, ChronoUnit.MINUTES));
            r.setEjecutadoPor(funcCre2.getNombre() + " " + funcCre2.getApellido());
            r.setEjecutadoPorId(funcCre2.getId());
            registroRepo.save(r);
        }

        // Trámite 3: Reclamo activo
        Tramite t3 = tramiteService.iniciar(p2.getId(), funcCre3.getId());
        t3.setEstado(EstadoTramite.EN_PROGRESO);
        tramiteRepo.save(t3);
        List<RegistroActividad> regsT3 = registroRepo.findByTramiteId(t3.getId());
        if (!regsT3.isEmpty()) {
            RegistroActividad r = regsT3.get(0);
            r.setAsignadoEn(Instant.now().minus(1, ChronoUnit.HOURS));
            r.setEjecutadoPor(funcCre3.getNombre() + " " + funcCre3.getApellido());
            r.setEjecutadoPorId(funcCre3.getId());
            registroRepo.save(r);
        }

        // Trámite 4: Completado (para Historial)
        Tramite t4 = tramiteService.iniciar(p1.getId(), funcCre1.getId());
        t4.setId("mock-tramite-finalizado-001");
        t4.setEstado(EstadoTramite.COMPLETADO);
        t4.setFinalizadoEn(Instant.now().minus(1, ChronoUnit.DAYS));
        tramiteRepo.save(t4);

        // Registros para T4
        String r1id = "reg-mock-001", r2id = "reg-mock-002";
        RegistroActividad r1 = RegistroActividad.builder()
                .id(r1id).tramiteId(t4.getId()).actividadId(p1.getCalles().get(0).getActividades().get(0).getId())
                .departamentoId(DEPT_ATC_ID).estado(EstadoRegistro.HECHO)
                .ejecutadoPor("Juan Pérez").ejecutadoPorId(FUNC_JUAN_ID)
                .asignadoEn(Instant.now().minus(2, ChronoUnit.DAYS))
                .completadoEn(Instant.now().minus(1, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .esquemaFormulario(Map.of("fields", List.of(
                        Map.of("key", "nombreTitular", "label", "Nombre Completo", "type", "text"),
                        Map.of("key", "direccion", "label", "Dirección", "type", "text")
                )))
                .datosFormulario(Map.of("nombreTitular", "Diego Garcia", "direccion", "Av. Principal 123"))
                .notas("Solicitud recibida correctamente.")
                .build();
        registroRepo.save(r1);

        RegistroActividad r2 = RegistroActividad.builder()
                .id(r2id).tramiteId(t4.getId()).actividadId(p1.getCalles().get(1).getActividades().get(0).getId())
                .departamentoId(DEPT_OPE_ID).estado(EstadoRegistro.HECHO)
                .ejecutadoPor("Roberto Flores").ejecutadoPorId(funcCre3.getId())
                .asignadoEn(r1.getCompletadoEn())
                .completadoEn(t4.getFinalizadoEn())
                .esquemaFormulario(Map.of("fields", List.of(
                        Map.of("key", "extra_edad", "label", "Edad Validada", "type", "number")
                )))
                .datosFormulario(Map.of("extra_edad", 25))
                .notas("Inspección realizada.")
                .build();
        registroRepo.save(r2);

        // ══════════════════════════════════════════════════════
        // TENANT 2: BND
        // ══════════════════════════════════════════════════════
        Tenant bnd = tenantRepo.save(Tenant.builder()
                .id(uid()).nombre("Banco Nacional de Desarrollo")
                .nit("9080706050").direccion("Edificio Los Arcos").industria("Banca")
                .sitioWeb("https://www.bnd.com.bo").telefonoInstitucional("+591 2 2112233")
                .emailContacto("info@bnd.com.bo").lema("Tu aliado en el crecimiento.")
                .build());

        Cargo cb1 = cargoRepo.save(Cargo.builder().tenantId(bnd.getId()).nombre("Gerente Comercial").codigo("B-GG").nivel("Directivo").build());
        Departamento db1 = departamentoRepo.save(Departamento.builder().tenantId(bnd.getId()).nombre("Comercial").codigo("B-DEP-COM").build());
        Departamento db2 = departamentoRepo.save(Departamento.builder().tenantId(bnd.getId()).nombre("Riesgos").codigo("B-DEP-RIE").build());

        Usuario adminBnd = crearUsuario(bnd.getId(), "Fernando", "Morales", "admin@bnd.com", "admin123", RolUsuario.ADMINISTRADOR, cb1.getNombre(), db1.getNombre(), db1.getId(), "+591 60010010");
        Usuario disenadorBnd = crearUsuario(bnd.getId(), "Sofía", "Herrera", "diseno@bnd.com", "diseno123", RolUsuario.DISENADOR, "Oficial de Crédito", db1.getNombre(), db1.getId(), "+591 60020020");
        Usuario funcBnd1 = crearUsuario(bnd.getId(), "Diego", "Ramírez", "diego@bnd.com", "func123", RolUsuario.FUNCIONARIO, "Oficial de Crédito", db1.getNombre(), db1.getId(), "+591 60030030");

        FormularioTemplate ft3 = templateRepo.save(FormularioTemplate.builder()
                .id(uid()).tenantId(bnd.getId()).nombre("Solicitud de Crédito")
                .descripcion("Datos financieros.")
                .campos(List.of(
                        campo("ingreso", "Ingreso Mensual", "number", true),
                        campo("monto", "Monto Solicitado", "number", true)
                )).build());

        Proyecto proyectoBnd = proyectoRepo.save(Proyecto.builder()
                .id(uid()).tenantId(bnd.getId()).nombre("Productos Financieros").estado("ACTIVO")
                .responsable(disenadorBnd.getNombre()).responsableId(disenadorBnd.getId())
                .build());

        PoliticaNegocio p4 = crearPoliticaCredito(bnd.getId(), proyectoBnd.getId(), db1.getId(), db2.getId(), db1.getId());
        PoliticaNegocio p5 = crearPoliticaCuentaEmpresarial(bnd.getId(), proyectoBnd.getId(), db1.getId(), db2.getId(), db2.getId());

        // Trámites BND
        Tramite t6 = tramiteService.iniciar(p4.getId(), funcBnd1.getId());
        t6.setEstado(EstadoTramite.EN_PROGRESO);
        tramiteRepo.save(t6);
        List<RegistroActividad> regsT6 = registroRepo.findByTramiteId(t6.getId());
        if (!regsT6.isEmpty()) {
            RegistroActividad r = regsT6.get(0);
            r.setAsignadoEn(Instant.now().minus(5, ChronoUnit.HOURS)); // Bottleneck
            r.setEjecutadoPor(funcBnd1.getNombre() + " " + funcBnd1.getApellido());
            r.setEjecutadoPorId(funcBnd1.getId());
            registroRepo.save(r);
        }

        log.info("🎉 SEEDER COMPLETADO CON ÉXITO.");
    }

    // ══════════════════════════════════════════════════════════════
    // FACTORIES DE POLÍTICAS
    // ══════════════════════════════════════════════════════════════

    private PoliticaNegocio crearPoliticaInstalacionMedidor(String tenantId, String proyectoId, String deptoAtencion, String deptoTecnico, String deptoFinanzas) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid(), a6 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Instalación de Medidor Eléctrico")
                .descripcion("Flujo completo para la instalación de un nuevo medidor eléctrico residencial o comercial, incluyendo inspección técnica y facturación.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Atención al Cliente", deptoAtencion, 0, "#6366f1", List.of(
                                actividad(a1, "Recepción de Solicitud", TipoActividad.INICIO, true, false, 0),
                                actividad(a6, "Entrega de Medidor", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Departamento Técnico", deptoTecnico, 1, "#22c55e", List.of(
                                actividad(a2, "Inspección de Terreno", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Evaluación Técnica", TipoActividad.DECISION, false, false, 1)
                        )),
                        calle("Finanzas", deptoFinanzas, 2, "#f97316", List.of(
                                actividad(a4, "Cálculo de Presupuesto", TipoActividad.TAREA, false, false, 0),
                                actividad(a5, "Emisión de Factura", TipoActividad.TAREA, false, false, 1)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, ""),
                        transicion(a3, a4, TipoRuta.CONDICIONAL, "Aprobado"),
                        transicion(a3, a6, TipoRuta.CONDICIONAL, "Rechazado"),
                        transicion(a4, a5, TipoRuta.SECUENCIAL, ""),
                        transicion(a5, a6, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaReclamo(String tenantId, String proyectoId, String deptoComercial, String deptoAtencion) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Reclamo por Facturación")
                .descripcion("Proceso para gestionar reclamos de clientes por errores o inconformidades en su factura mensual de electricidad.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Mesa de Partes", deptoComercial, 0, "#8b5cf6", List.of(
                                actividad(a1, "Registro del Reclamo", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Back Office Comercial", deptoComercial, 1, "#06b6d4", List.of(
                                actividad(a2, "Investigación de Consumo", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Resolución y Respuesta", TipoActividad.TAREA, false, false, 1)
                        )),
                        calle("Atención al Cliente", deptoAtencion, 2, "#22c55e", List.of(
                                actividad(a4, "Notificación al Cliente", TipoActividad.FIN, false, true, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, ""),
                        transicion(a3, a4, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaCambioTitular(String tenantId, String proyectoId, String dVentanillaId, String dLegalId, String dSistemasId) {
        String a1 = uid(), a2 = uid(), a3 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Cambio de Titular de Servicio")
                .descripcion("Proceso para transferir la titularidad de un servicio eléctrico de un cliente a otro.")
                .version(1).estaActiva(false)
                .calles(List.of(
                        calle("Ventanilla", dVentanillaId, 0, "#f97316", List.of(
                                actividad(a1, "Recepción de Documentos", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Legal", dLegalId, 1, "#e11d48", List.of(
                                actividad(a2, "Verificación Legal", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Sistemas", dSistemasId, 2, "#3b82f6", List.of(
                                actividad(a3, "Actualización en Sistema", TipoActividad.FIN, false, true, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaCredito(String tenantId, String proyectoId, String dAtencionId, String dRiesgosId, String dOperacionesId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid(), a6 = uid(), a7 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Aprobación de Crédito Personal")
                .descripcion("Flujo integral para la solicitud, evaluación, aprobación y desembolso de créditos personales a clientes del banco.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Plataforma de Atención", dAtencionId, 0, "#6366f1", List.of(
                                actividad(a1, "Recepción de Solicitud", TipoActividad.INICIO, true, false, 0),
                                actividad(a7, "Entrega de Contrato", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Análisis de Riesgos", dRiesgosId, 1, "#f59e0b", List.of(
                                actividad(a2, "Verificación en Central de Riesgo", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Evaluación del Score Crediticio", TipoActividad.DECISION, false, false, 1)
                        )),
                        calle("Comité de Créditos", dRiesgosId, 2, "#22c55e", List.of(
                                actividad(a4, "Aprobación del Comité", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Operaciones", dOperacionesId, 3, "#06b6d4", List.of(
                                actividad(a5, "Generación de Contrato", TipoActividad.TAREA, false, false, 0),
                                actividad(a6, "Desembolso de Fondos", TipoActividad.TAREA, false, false, 1)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, ""),
                        transicion(a3, a4, TipoRuta.CONDICIONAL, "Score >= 650"),
                        transicion(a3, a7, TipoRuta.CONDICIONAL, "Score < 650 - Rechazado"),
                        transicion(a4, a5, TipoRuta.SECUENCIAL, ""),
                        transicion(a5, a6, TipoRuta.SECUENCIAL, ""),
                        transicion(a6, a7, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaCuentaEmpresarial(String tenantId, String proyectoId, String dBancaId, String dComplianceId, String dOperacionesId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Apertura de Cuenta Empresarial")
                .descripcion("Proceso para la apertura de cuentas corrientes para personas jurídicas, incluyendo verificación de documentos legales.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Banca Empresarial", dBancaId, 0, "#8b5cf6", List.of(
                                actividad(a1, "Recepción de Documentos", TipoActividad.INICIO, true, false, 0),
                                actividad(a5, "Activación de Cuenta", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Compliance", dComplianceId, 1, "#e11d48", List.of(
                                actividad(a2, "Due Diligence KYC", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Verificación Anti-Lavado", TipoActividad.TAREA, false, false, 1)
                        )),
                        calle("Operaciones Bancarias", dOperacionesId, 2, "#3b82f6", List.of(
                                actividad(a4, "Configuración de Cuenta", TipoActividad.TAREA, false, false, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, ""),
                        transicion(a3, a4, TipoRuta.SECUENCIAL, ""),
                        transicion(a4, a5, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaTarjeta(String tenantId, String proyectoId, String dAtencionId, String dRiesgosId) {
        String a1 = uid(), a2 = uid(), a3 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId).proyectoId(proyectoId)
                .nombre("Solicitud de Tarjeta de Crédito")
                .descripcion("Proceso para solicitar y aprobar tarjetas de crédito para clientes existentes del banco.")
                .version(1).estaActiva(false)
                .calles(List.of(
                        calle("Atención", dAtencionId, 0, "#6366f1", List.of(
                                actividad(a1, "Solicitud del Cliente", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Riesgos", dRiesgosId, 1, "#f97316", List.of(
                                actividad(a2, "Análisis Crediticio", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Emisión", dRiesgosId, 2, "#22c55e", List.of(
                                actividad(a3, "Emisión de Tarjeta", TipoActividad.FIN, false, true, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    // ══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ══════════════════════════════════════════════════════════════

    private String uid() { return UUID.randomUUID().toString(); }

    private Usuario crearUsuario(String tenantId, String nombre, String apellido, String email, String password, RolUsuario rol, String cargo, String depto, String deptoId, String telf) {
        return Usuario.builder()
                .id(uid()).tenantId(tenantId)
                .nombre(nombre).apellido(apellido).email(email).password(password)
                .rol(rol).cargo(cargo).departamento(depto).departamentoId(deptoId).telefono(telf)
                .build();
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

    private FormularioTemplate crearTemplate(String tenantId, String nombre, String desc) {
        return FormularioTemplate.builder()
                .id(uid()).tenantId(tenantId).nombre(nombre).descripcion(desc)
                .campos(new ArrayList<>()).build();
    }

    private FormularioTemplate.CampoFormulario campo(String key, String label, String type, boolean req) {
        return FormularioTemplate.CampoFormulario.builder().key(key).label(label).type(type).required(req).build();
    }

    private FormularioTemplate.CampoFormulario campo(String key, String label, String type, boolean req, List<String> opts) {
        return FormularioTemplate.CampoFormulario.builder().key(key).label(label).type(type).required(req).options(opts).build();
    }
}

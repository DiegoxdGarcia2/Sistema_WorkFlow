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

    @Override
    public void run(String... args) {
        if (tenantRepo.count() > 0) {
            log.info("⏭️  Base de datos ya tiene datos. Seeder omitido.");
            return;
        }

        log.info("🌱 Iniciando seeder masivo de datos de prueba...");

        // ══════════════════════════════════════════════════════
        // TENANT 1: CRE (Cooperativa Rural de Electrificación)
        // ══════════════════════════════════════════════════════
        Tenant cre = tenantRepo.save(Tenant.builder()
                .id(UUID.randomUUID().toString())
                .nombre("CRE - Cooperativa Eléctrica")
                .build());
        log.info("✅ Tenant creado: {}", cre.getNombre());

        // Usuarios CRE
        Usuario adminCre = crearUsuario(cre.getId(), "Carlos Mendoza", "admin@cre.com", "admin123", RolUsuario.ADMINISTRADOR);
        Usuario disenadorCre = crearUsuario(cre.getId(), "María García", "diseno@cre.com", "diseno123", RolUsuario.DISENADOR);
        Usuario funcCre1 = crearUsuario(cre.getId(), "Juan Pérez", "juan@cre.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario funcCre2 = crearUsuario(cre.getId(), "Ana Rodríguez", "ana@cre.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario funcCre3 = crearUsuario(cre.getId(), "Roberto Flores", "roberto@cre.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario funcCre4 = crearUsuario(cre.getId(), "Lucía Vargas", "lucia@cre.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario clienteCre1 = crearUsuario(cre.getId(), "Pedro Sánchez", "pedro@gmail.com", "cliente123", RolUsuario.CLIENTE);
        Usuario clienteCre2 = crearUsuario(cre.getId(), "Laura Torres", "laura@gmail.com", "cliente123", RolUsuario.CLIENTE);
        log.info("✅ CRE: 8 usuarios creados");

        // ── Política 1: Instalación de Medidor (compleja, con FORK/JOIN) ──
        PoliticaNegocio p1 = crearPoliticaInstalacionMedidor(cre.getId());
        log.info("✅ Política '{}' creada con {} calles, {} nodos, {} transiciones",
                p1.getNombre(), p1.getCalles().size(),
                p1.getCalles().stream().mapToInt(c -> c.getActividades().size()).sum(),
                p1.getTransiciones().size());

        // ── Política 2: Reclamo por Facturación ──
        PoliticaNegocio p2 = crearPoliticaReclamo(cre.getId());
        log.info("✅ Política '{}' creada y activada", p2.getNombre());

        // ── Política 3: Cambio de Titular (borrador) ──
        PoliticaNegocio p3 = crearPoliticaCambioTitular(cre.getId());
        log.info("✅ Política '{}' creada como borrador", p3.getNombre());

        // ── Trámites con datos realistas ──

        // Trámite 1: Instalación completa en progreso (tarea asignada a Juan)
        Tramite t1 = tramiteService.iniciar(p1.getId());
        List<RegistroActividad> regsT1 = registroRepo.findByTramiteId(t1.getId());
        if (!regsT1.isEmpty()) {
            registroService.tomarTarea(regsT1.get(0).getId(), funcCre1.getId());
        }
        log.info("✅ Trámite 1 (Instalación) iniciado y asignado a Juan");

        // Trámite 2: Instalación avanzada (primera tarea completada)
        Tramite t2 = tramiteService.iniciar(p1.getId());
        List<RegistroActividad> regsT2 = registroRepo.findByTramiteId(t2.getId());
        if (!regsT2.isEmpty()) {
            registroService.tomarTarea(regsT2.get(0).getId(), funcCre2.getId());
            registroService.completarTarea(
                    regsT2.get(0).getId(),
                    Map.of("campos", List.of(
                            Map.of("nombre", "numeroMedidor", "tipo", "texto"),
                            Map.of("nombre", "direccion", "tipo", "texto"),
                            Map.of("nombre", "tipoServicio", "tipo", "texto")
                    )),
                    Map.of("numeroMedidor", "MED-2026-00458",
                            "direccion", "Av. Santos Dumont #1250, Zona Norte",
                            "tipoServicio", "Residencial Monofásico"),
                    "Solicitud recibida con toda la documentación. Cliente presenta CI y factura de luz anterior.");
        }
        // Asignar segunda tarea a Roberto
        List<RegistroActividad> regsT2b = registroRepo.findByTramiteIdAndEstado(t2.getId(), EstadoRegistro.PENDIENTE);
        if (!regsT2b.isEmpty()) {
            registroService.tomarTarea(regsT2b.get(0).getId(), funcCre3.getId());
        }
        log.info("✅ Trámite 2 (Instalación) avanzado: recepción completada, inspección en progreso");

        // Trámite 3: Reclamo sin asignar
        Tramite t3 = tramiteService.iniciar(p2.getId());
        log.info("✅ Trámite 3 (Reclamo) iniciado, sin asignar");

        // Trámite 4: Reclamo asignado a Ana
        Tramite t4 = tramiteService.iniciar(p2.getId());
        List<RegistroActividad> regsT4 = registroRepo.findByTramiteId(t4.getId());
        if (!regsT4.isEmpty()) {
            registroService.tomarTarea(regsT4.get(0).getId(), funcCre2.getId());
        }
        log.info("✅ Trámite 4 (Reclamo) asignado a Ana");

        // Trámite 5: Otro reclamo completo (todo el flujo terminado)
        Tramite t5 = tramiteService.iniciar(p2.getId());
        List<RegistroActividad> regsT5 = registroRepo.findByTramiteId(t5.getId());
        if (!regsT5.isEmpty()) {
            registroService.tomarTarea(regsT5.get(0).getId(), funcCre4.getId());
            registroService.completarTarea(
                    regsT5.get(0).getId(),
                    Map.of("campos", List.of(
                            Map.of("nombre", "motivoReclamo", "tipo", "textarea"),
                            Map.of("nombre", "montoReclamado", "tipo", "numero"),
                            Map.of("nombre", "periodoFacturado", "tipo", "texto")
                    )),
                    Map.of("motivoReclamo", "Cobro excesivo en factura de marzo 2026. Consumo normal es 150kWh y se facturó 890kWh.",
                            "montoReclamado", 1250.50,
                            "periodoFacturado", "Marzo 2026"),
                    "Se verificó lectura anterior y actual. Error confirmado en la lectura del medidor.");
        }
        log.info("✅ Trámite 5 (Reclamo) completado con formulario llenado");

        // ══════════════════════════════════════════════════════
        // TENANT 2: Banco Nacional de Desarrollo
        // ══════════════════════════════════════════════════════
        Tenant banco = tenantRepo.save(Tenant.builder()
                .id(UUID.randomUUID().toString())
                .nombre("Banco Nacional de Desarrollo")
                .build());
        log.info("✅ Tenant creado: {}", banco.getNombre());

        // Usuarios Banco
        Usuario adminBanco = crearUsuario(banco.getId(), "Fernando Morales", "admin@bnd.com", "admin123", RolUsuario.ADMINISTRADOR);
        Usuario disenadorBanco = crearUsuario(banco.getId(), "Sofía Herrera", "diseno@bnd.com", "diseno123", RolUsuario.DISENADOR);
        Usuario funcBanco1 = crearUsuario(banco.getId(), "Diego Ramírez", "diego@bnd.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario funcBanco2 = crearUsuario(banco.getId(), "Camila López", "camila@bnd.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario funcBanco3 = crearUsuario(banco.getId(), "Andrés Suárez", "andres@bnd.com", "func123", RolUsuario.FUNCIONARIO);
        Usuario clienteBanco1 = crearUsuario(banco.getId(), "Ricardo Paz", "ricardo@gmail.com", "cliente123", RolUsuario.CLIENTE);
        Usuario clienteBanco2 = crearUsuario(banco.getId(), "Valentina Cruz", "valentina@gmail.com", "cliente123", RolUsuario.CLIENTE);
        Usuario clienteBanco3 = crearUsuario(banco.getId(), "Mateo Gutiérrez", "mateo@gmail.com", "cliente123", RolUsuario.CLIENTE);
        log.info("✅ BND: 8 usuarios creados");

        // ── Política 4: Aprobación de Crédito Personal ──
        PoliticaNegocio p4 = crearPoliticaCredito(banco.getId());
        log.info("✅ Política '{}' creada y activada", p4.getNombre());

        // ── Política 5: Apertura de Cuenta Empresarial ──
        PoliticaNegocio p5 = crearPoliticaCuentaEmpresarial(banco.getId());
        log.info("✅ Política '{}' creada y activada", p5.getNombre());

        // ── Política 6: Solicitud de Tarjeta de Crédito (borrador) ──
        PoliticaNegocio p6 = crearPoliticaTarjeta(banco.getId());
        log.info("✅ Política '{}' creada como borrador", p6.getNombre());

        // Trámites Banco
        Tramite t6 = tramiteService.iniciar(p4.getId());
        List<RegistroActividad> regsT6 = registroRepo.findByTramiteId(t6.getId());
        if (!regsT6.isEmpty()) {
            registroService.tomarTarea(regsT6.get(0).getId(), funcBanco1.getId());
            registroService.completarTarea(
                    regsT6.get(0).getId(),
                    Map.of("campos", List.of(
                            Map.of("nombre", "nombreSolicitante", "tipo", "texto"),
                            Map.of("nombre", "montoSolicitado", "tipo", "numero"),
                            Map.of("nombre", "plazo", "tipo", "texto"),
                            Map.of("nombre", "ingresoMensual", "tipo", "numero")
                    )),
                    Map.of("nombreSolicitante", "Ricardo Paz Gutiérrez",
                            "montoSolicitado", 50000,
                            "plazo", "36 meses",
                            "ingresoMensual", 8500),
                    "Documentación completa. CI, certificado de trabajo y últimos 3 recibos de sueldo presentados.");
        }
        List<RegistroActividad> regsT6b = registroRepo.findByTramiteIdAndEstado(t6.getId(), EstadoRegistro.PENDIENTE);
        if (!regsT6b.isEmpty()) {
            registroService.tomarTarea(regsT6b.get(0).getId(), funcBanco2.getId());
        }
        log.info("✅ Trámite 6 (Crédito) recepción completada, análisis en progreso");

        Tramite t7 = tramiteService.iniciar(p4.getId());
        log.info("✅ Trámite 7 (Crédito) iniciado, sin asignar");

        Tramite t8 = tramiteService.iniciar(p5.getId());
        List<RegistroActividad> regsT8 = registroRepo.findByTramiteId(t8.getId());
        if (!regsT8.isEmpty()) {
            registroService.tomarTarea(regsT8.get(0).getId(), funcBanco3.getId());
        }
        log.info("✅ Trámite 8 (Cuenta Empresarial) asignado a Andrés");

        Tramite t9 = tramiteService.iniciar(p5.getId());
        Tramite t10 = tramiteService.iniciar(p4.getId());
        log.info("✅ Trámites 9 y 10 iniciados sin asignar");

        log.info("══════════════════════════════════════════════════════");
        log.info("🎉 SEEDER COMPLETADO:");
        log.info("   📦 2 Tenants");
        log.info("   👥 16 Usuarios");
        log.info("   📐 6 Políticas (4 activas, 2 borradores)");
        log.info("   📋 10 Trámites en distintos estados");
        log.info("══════════════════════════════════════════════════════");
    }

    // ══════════════════════════════════════════════════════════════
    // FACTORIES DE POLÍTICAS
    // ══════════════════════════════════════════════════════════════

    private PoliticaNegocio crearPoliticaInstalacionMedidor(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid(), a6 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Instalación de Medidor Eléctrico")
                .descripcion("Flujo completo para la instalación de un nuevo medidor eléctrico residencial o comercial, incluyendo inspección técnica y facturación.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Atención al Cliente", 0, List.of(
                                actividad(a1, "Recepción de Solicitud", TipoActividad.INICIO, true, false, 0),
                                actividad(a6, "Entrega de Medidor", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Departamento Técnico", 1, List.of(
                                actividad(a2, "Inspección de Terreno", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Evaluación Técnica", TipoActividad.DECISION, false, false, 1)
                        )),
                        calle("Finanzas", 2, List.of(
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

    private PoliticaNegocio crearPoliticaReclamo(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Reclamo por Facturación")
                .descripcion("Proceso para gestionar reclamos de clientes por errores o inconformidades en su factura mensual de electricidad.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Mesa de Partes", 0, List.of(
                                actividad(a1, "Registro del Reclamo", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Back Office Comercial", 1, List.of(
                                actividad(a2, "Investigación de Consumo", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Resolución y Respuesta", TipoActividad.TAREA, false, false, 1)
                        )),
                        calle("Atención al Cliente", 2, List.of(
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

    private PoliticaNegocio crearPoliticaCambioTitular(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Cambio de Titular de Servicio")
                .descripcion("Proceso para transferir la titularidad de un servicio eléctrico de un cliente a otro.")
                .version(1).estaActiva(false) // BORRADOR
                .calles(List.of(
                        calle("Ventanilla", 0, List.of(
                                actividad(a1, "Recepción de Documentos", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Legal", 1, List.of(
                                actividad(a2, "Verificación Legal", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Sistemas", 2, List.of(
                                actividad(a3, "Actualización en Sistema", TipoActividad.FIN, false, true, 0)
                        ))
                ))
                .transiciones(List.of(
                        transicion(a1, a2, TipoRuta.SECUENCIAL, ""),
                        transicion(a2, a3, TipoRuta.SECUENCIAL, "")
                ))
                .build());
    }

    private PoliticaNegocio crearPoliticaCredito(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid(), a6 = uid(), a7 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Aprobación de Crédito Personal")
                .descripcion("Flujo integral para la solicitud, evaluación, aprobación y desembolso de créditos personales a clientes del banco.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Plataforma de Atención", 0, List.of(
                                actividad(a1, "Recepción de Solicitud", TipoActividad.INICIO, true, false, 0),
                                actividad(a7, "Entrega de Contrato", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Análisis de Riesgos", 1, List.of(
                                actividad(a2, "Verificación en Central de Riesgo", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Evaluación del Score Crediticio", TipoActividad.DECISION, false, false, 1)
                        )),
                        calle("Comité de Créditos", 2, List.of(
                                actividad(a4, "Aprobación del Comité", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Operaciones", 3, List.of(
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

    private PoliticaNegocio crearPoliticaCuentaEmpresarial(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid(), a4 = uid(), a5 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Apertura de Cuenta Empresarial")
                .descripcion("Proceso para la apertura de cuentas corrientes para personas jurídicas, incluyendo verificación de documentos legales.")
                .version(1).estaActiva(true)
                .calles(List.of(
                        calle("Banca Empresarial", 0, List.of(
                                actividad(a1, "Recepción de Documentos", TipoActividad.INICIO, true, false, 0),
                                actividad(a5, "Activación de Cuenta", TipoActividad.FIN, false, true, 1)
                        )),
                        calle("Compliance", 1, List.of(
                                actividad(a2, "Due Diligence KYC", TipoActividad.TAREA, false, false, 0),
                                actividad(a3, "Verificación Anti-Lavado", TipoActividad.TAREA, false, false, 1)
                        )),
                        calle("Operaciones Bancarias", 2, List.of(
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

    private PoliticaNegocio crearPoliticaTarjeta(String tenantId) {
        String a1 = uid(), a2 = uid(), a3 = uid();

        return politicaRepo.save(PoliticaNegocio.builder()
                .id(uid()).tenantId(tenantId)
                .nombre("Solicitud de Tarjeta de Crédito")
                .descripcion("Proceso para solicitar y aprobar tarjetas de crédito para clientes existentes del banco.")
                .version(1).estaActiva(false) // BORRADOR
                .calles(List.of(
                        calle("Atención", 0, List.of(
                                actividad(a1, "Solicitud del Cliente", TipoActividad.INICIO, true, false, 0)
                        )),
                        calle("Riesgos", 1, List.of(
                                actividad(a2, "Análisis Crediticio", TipoActividad.TAREA, false, false, 0)
                        )),
                        calle("Emisión", 2, List.of(
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

    private Usuario crearUsuario(String tenantId, String nombre, String email, String password, RolUsuario rol) {
        return usuarioRepo.save(Usuario.builder()
                .id(uid()).tenantId(tenantId)
                .nombre(nombre).email(email).password(password).rol(rol)
                .build());
    }

    private Actividad actividad(String id, String nombre, TipoActividad tipo, boolean esInicial, boolean esFinal, int orden) {
        return Actividad.builder().id(id).nombre(nombre).tipo(tipo).esInicial(esInicial).esFinal(esFinal).orden(orden).build();
    }

    private Calle calle(String nombre, int orden, List<Actividad> actividades) {
        return Calle.builder().id(uid()).nombre(nombre).orden(orden).actividades(new ArrayList<>(actividades)).build();
    }

    private Transicion transicion(String origenId, String destinoId, TipoRuta tipo, String etiqueta) {
        return Transicion.builder().id(uid()).origenId(origenId).destinoId(destinoId)
                .tipoRuta(tipo).etiqueta(etiqueta != null ? etiqueta : "").prioridad(0).build();
    }
}

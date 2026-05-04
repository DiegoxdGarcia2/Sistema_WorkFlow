package com.bpm.inteligente.config;

/**
 * Almacena el contexto del Tenant y Usuario para la petición HTTP actual.
 * Se puebla en JwtAuthenticationFilter y se limpia en el bloque finally.
 * Usa ThreadLocal para garantizar aislamiento por hilo (thread-safe).
 */
public class TenantContext {

    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();
    private static final ThreadLocal<String> currentUserId = new ThreadLocal<>();

    public static void setCurrentTenant(String tenantId) {
        currentTenant.set(tenantId);
    }

    public static String getCurrentTenant() {
        return currentTenant.get();
    }

    public static void setCurrentUserId(String userId) {
        currentUserId.set(userId);
    }

    public static String getCurrentUserId() {
        return currentUserId.get();
    }

    /**
     * IMPORTANTE: Debe llamarse siempre en el bloque finally del filtro
     * para evitar memory leaks con ThreadLocal.
     */
    public static void clear() {
        currentTenant.remove();
        currentUserId.remove();
    }
}

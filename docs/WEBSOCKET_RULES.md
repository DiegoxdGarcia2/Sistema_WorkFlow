# WebSocket Rules — Regla de Oro

> **REGLA #1 — Echo Loop Prevention:**
> NUNCA actualizar el estado local y emitir un evento WebSocket al mismo tiempo sin un mecanismo de bloqueo.
> El patrón correcto es:
> 1. El **originador** actualiza su estado local.
> 2. Emite el evento WebSocket.
> 3. Los **receptores** reciben el evento y actualizan su estado.
> 4. El originador **ignora** su propio eco usando `filter(msg => msg.senderId !== myId)`.

## Reglas de Performance

### RxJS Throttling
- **Eventos de arrastre (drag):** Usar siempre `debounceTime(50)` para limitar la frecuencia de emisión.
- **Eventos de resize/scroll:** Usar `throttleTime(100, undefined, { leading: true, trailing: true })`.
- **Eventos de typing:** Usar `debounceTime(300)`.

### Angular Zone Management
- **Animaciones visuales** durante drag/scroll/resize deben ejecutarse usando `NgZone.runOutsideAngular(() => { ... })` para evitar congelar la UI con change detection innecesario.
- Solo re-entrar la zona (`ngZone.run(...)`) cuando el estado final se haya resuelto y necesite actualizar la vista.

### Patrón de Mensajes STOMP
```
Prefijo servidor:  /topic/{tenantId}/politica/{politicaId}/...
Prefijo cliente:   /app/politica/{politicaId}/...
```

### Identificación de Sesión
- Cada cliente WebSocket genera un `sessionId` único al conectar.
- El `senderId` se incluye en **cada** mensaje WebSocket.
- Los mensajes propios se filtran en el cliente, **nunca** en el servidor.

## Anti-Patterns (NO HACER)

| ❌ Anti-Pattern | ✅ Correcto |
|----------------|------------|
| `setState()` + `ws.send()` sin filtro | `setState()` + `ws.send()` con `filter(m => m.senderId !== myId)` |
| `drag` sin throttle | `drag$.pipe(debounceTime(50))` |
| Animaciones dentro de NgZone | `ngZone.runOutsideAngular(() => animate())` |
| Reconexión sin backoff | Exponential backoff: 1s, 2s, 4s, 8s, max 30s |
| Broadcast sin scope de tenant | Siempre incluir `tenantId` en el topic |

import { Injectable, signal, NgZone } from '@angular/core';
import { Client, Message, StompHeaders } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { Subject, throttleTime } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ColaboradorDTO {
  id: string;
  nombre: string;
  color: string;
  avatar: string;
  nodoEditandoId?: string;
  cursorX?: number;
  cursorY?: number;
}

export interface SocketMessageDTO {
  type: string;
  colaborador: ColaboradorDTO;
  payload: any;
}

/**
 * Servicio de colaboración en tiempo real con WebSocket STOMP.
 * 
 * REGLAS DE ORO (ver docs/WEBSOCKET_RULES.md):
 * - Echo Loop Prevention: filtrar mensajes propios via colaborador.id
 * - debounceTime(50) para eventos de arrastre
 * - NgZone.runOutsideAngular para animaciones
 * - JWT token en headers STOMP para autenticación
 */
@Injectable({
  providedIn: 'root'
})
export class ColaboracionService {
  private client: Client | null = null;
  private currentRoom: string | null = null;
  
  // Estado reactivo para la UI
  public colaboradores = signal<ColaboradorDTO[]>([]);
  public nodeUpdates = signal<SocketMessageDTO | null>(null);

  // ── Throttling para eventos de arrastre (docs/WEBSOCKET_RULES.md) ──
  private dragSubject = new Subject<{ nodoId: string; posX: number; posY: number }>();
  private cursorSubject = new Subject<{ x: number; y: number }>();

  // Colores para usuarios
  private colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

  constructor(
    private authSvc: AuthService,
    private ngZone: NgZone
  ) {
    // ── throttleTime(80ms) para drag → emisión consistente cada 80ms ──
    // throttleTime es superior a debounceTime para movimientos porque:
    // - throttle emite a intervalos regulares (fluidez constante)
    // - debounce espera a que el usuario deje de mover (jitter percibido)
    this.dragSubject.pipe(throttleTime(80)).subscribe(({ nodoId, posX, posY }) => {
      this.emitNodeMoved(nodoId, posX, posY);
    });

    this.cursorSubject.pipe(throttleTime(150)).subscribe(({ x, y }) => {
      this.emitCursorMoved(x, y);
    });
  }

  private getMe(): ColaboradorDTO {
    const user = this.authSvc.usuario();
    const name = user?.nombre || 'Usuario Desconocido';
    const id = user?.id || crypto.randomUUID();
    
    const parts = name.split(' ');
    const avatar = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
    const colorIndex = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % this.colors.length;

    return { id, nombre: name, color: this.colors[colorIndex], avatar };
  }

  /**
   * Conecta a una sala de colaboración con JWT autenticado.
   * El token se envía en los headers STOMP del CONNECT frame.
   */
  conectarRoom(politicaId: string) {
    if (this.currentRoom === politicaId) return;

    this.desconectar();
    this.currentRoom = politicaId;

    const me = this.getMe();
    const token = this.authSvc.getToken();

    this.client = new Client({
      brokerURL: environment.wsUrl,
      reconnectDelay: 5000,
      // ── JWT en headers STOMP para autenticación ──
      connectHeaders: token ? { 'Authorization': `Bearer ${token}` } as StompHeaders : {},
      debug: (str) => {
        // Solo en desarrollo
        // console.log('[STOMP]', str);
      }
    });

    this.client.onConnect = () => {
      console.log('🔗 [Colaboración] Conectado a sala:', politicaId);
      
      const myId = me.id;

      // Suscribirse a la sala con filtro de eco
      this.client?.subscribe('/topic/politica/' + politicaId, (message: Message) => {
        if (message.body) {
          const msg: SocketMessageDTO = JSON.parse(message.body);
          
          // ── ECHO LOOP PREVENTION (docs/WEBSOCKET_RULES.md) ──
          // Ignorar mensajes propios para NODE_MOVED y NODE_EDITING
          if (msg.colaborador?.id === myId && 
              (msg.type === 'NODE_MOVED' || msg.type === 'NODE_EDITING')) {
            return;
          }
          
          // Ejecutar fuera de NgZone para animaciones, re-entrar para state
          this.ngZone.run(() => this.handleMessage(msg));
        }
      });

      // Avisar al backend que entré
      this.client?.publish({
        destination: `/app/politica/${politicaId}/join`,
        body: JSON.stringify(me)
      });
    };

    this.client.onStompError = (frame) => {
      console.error('❌ [STOMP] Error:', frame.headers['message']);
      if (frame.headers['message']?.includes('401') || frame.headers['message']?.includes('Unauthorized')) {
        console.warn('🔐 Token JWT inválido en WebSocket. Re-login requerido.');
        this.authSvc.logout();
      }
    };

    // Activar fuera de Angular zone para no triggear change detection
    this.ngZone.runOutsideAngular(() => {
      this.client?.activate();
    });
  }

  desconectar() {
    if (this.client && this.client.connected && this.currentRoom) {
      const me = this.getMe();
      this.client.publish({
        destination: `/app/politica/${this.currentRoom}/leave`,
        body: JSON.stringify(me)
      });
      this.client.deactivate();
    }
    this.currentRoom = null;
    this.colaboradores.set([]);
  }

  private handleMessage(msg: SocketMessageDTO) {
    switch (msg.type) {
      case 'ROOM_STATE':
        const lista = msg.payload as ColaboradorDTO[];
        this.colaboradores.set(lista);
        break;
      case 'NODE_EDITING':
      case 'NODE_MOVED':
      case 'POLICY_UPDATED':
        this.nodeUpdates.set(msg);
        break;
    }
  }

  // ── Emisión de eventos ──────────────────────────────────────

  notificarEdicionNodo(nodoId: string | null) {
    if (!this.client || !this.client.connected || !this.currentRoom) return;
    
    const msg: SocketMessageDTO = {
      type: 'NODE_EDITING',
      colaborador: this.getMe(),
      payload: nodoId
    };
    
    this.client.publish({
      destination: `/app/politica/${this.currentRoom}/node-editing`,
      body: JSON.stringify(msg)
    });
  }

  /**
   * Notifica movimiento de nodo con debounce automático.
   * Usa debounceTime(50) — ver docs/WEBSOCKET_RULES.md
   */
  notificarMovimientoNodo(nodoId: string, posX: number, posY: number) {
    this.dragSubject.next({ nodoId, posX, posY });
  }

  /** Emisión real del evento (post-debounce) */
  private emitNodeMoved(nodoId: string, posX: number, posY: number) {
    if (!this.client || !this.client.connected || !this.currentRoom) return;
    
    const msg: SocketMessageDTO = {
      type: 'NODE_MOVED',
      colaborador: this.getMe(),
      payload: { id: nodoId, x: posX, y: posY }
    };
    
    this.client.publish({
      destination: `/app/politica/${this.currentRoom}/node-moved`,
      body: JSON.stringify(msg)
    });
  }

  /** Difunde el estado completo de la política a todos los colaboradores en la sala. */
  notificarCambioCompleto(politica: any) {
    if (!this.client || !this.client.connected || !this.currentRoom) return;

    const msg: SocketMessageDTO = {
      type: 'POLICY_UPDATED',
      colaborador: this.getMe(),
      payload: politica
    };

    this.client.publish({
      destination: `/app/politica/${this.currentRoom}/policy-updated`,
      body: JSON.stringify(msg)
    });
  }

  /** Notifica la posición del cursor para presencia visual. */
  notificarCursor(x: number, y: number) {
    this.cursorSubject.next({ x, y });
  }

  private emitCursorMoved(x: number, y: number) {
    if (!this.client || !this.client.connected || !this.currentRoom) return;

    const msg: SocketMessageDTO = {
      type: 'CURSOR_MOVED',
      colaborador: this.getMe(),
      payload: { x, y }
    };

    this.client.publish({
      destination: `/app/politica/${this.currentRoom}/cursor-moved`,
      body: JSON.stringify(msg)
    });
  }
}

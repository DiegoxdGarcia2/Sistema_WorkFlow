import { Injectable, signal, NgZone } from '@angular/core';
import { Client, Message, StompHeaders } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { Subject, throttleTime, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

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
  private cachedUserId: string | null = null;

  private clientDoc: Client | null = null;
  private currentDocRoom: string | null = null;
  
  // Estado reactivo para la UI
  public colaboradores = signal<ColaboradorDTO[]>([]);
  public colaboradoresDoc = signal<ColaboradorDTO[]>([]);
  public nodeUpdates = signal<SocketMessageDTO | null>(null);
  public highFreqUpdates$ = new Subject<SocketMessageDTO>();
  public docEdits$ = new Subject<SocketMessageDTO>();
  public docCursors$ = new Subject<SocketMessageDTO>();
  public docLogs$ = new Subject<SocketMessageDTO>();
  public yjsUpdates$ = new Subject<SocketMessageDTO>();

  // ── Throttling para eventos de arrastre (docs/WEBSOCKET_RULES.md) ──
  private dragSubject = new Subject<{ nodoId: string; posX: number; posY: number }>();
  private cursorSubject = new Subject<{ x: number; y: number }>();
  private docEditSubject = new Subject<string>();
  private docCursorSubject = new Subject<number>();

  // Colores para usuarios
  private colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

  constructor(
    private authSvc: AuthService,
    private ngZone: NgZone,
    private http: HttpClient
  ) {
    // ── throttleTime(80ms) para drag → emisión consistente cada 80ms ──
    this.dragSubject.pipe(throttleTime(80)).subscribe(({ nodoId, posX, posY }) => {
      this.emitNodeMoved(nodoId, posX, posY);
    });

    this.cursorSubject.pipe(throttleTime(80)).subscribe(({ x, y }) => {
      this.emitCursorMoved(x, y);
    });

    // ── Throttling para edición colaborativa de documentos ──
    this.docEditSubject.pipe(throttleTime(80, undefined, { leading: true, trailing: true })).subscribe((content) => {
      this.emitDocEdit(content);
    });

    this.docCursorSubject.pipe(throttleTime(80)).subscribe((pos) => {
      this.emitDocCursor(pos);
    });
  }

  private fallbackId = crypto.randomUUID();

  private getMe(): ColaboradorDTO {
    const user = this.authSvc.usuario();
    const name = user?.nombre || 'Usuario Desconocido';
    const id = user?.id || this.fallbackId;
    
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
      heartbeatIncoming: 10000, // Esperar ping del server cada 10s
      heartbeatOutgoing: 10000, // Enviar ping al server cada 10s
      // ── JWT en headers STOMP para autenticación ──
      connectHeaders: token ? { 'Authorization': `Bearer ${token}` } as StompHeaders : {},
      debug: (str) => {
        // Solo en desarrollo
        // console.log('[STOMP]', str);
      }
    });

    this.cachedUserId = this.getMe().id;

    this.client.onWebSocketClose = (evt) => {
      console.warn('⚠️ [WebSocket] Conexión cerrada. Code:', evt.code, 'Reason:', evt.reason);
    };

    this.client.onConnect = () => {
      console.log('🔗 [Colaboración] Conectado a sala:', politicaId);
      
      // Suscribirse a la sala con filtro de eco
      this.client?.subscribe('/topic/politica/' + politicaId, (message: Message) => {
        if (message.body) {
          const msg: SocketMessageDTO = JSON.parse(message.body);
          
          // ── ECHO LOOP PREVENTION (docs/WEBSOCKET_RULES.md) ──
          // Ignorar TODO mensaje que provenga de mí mismo para evitar bucles de retroalimentación.
          if (msg.colaborador?.id === this.cachedUserId) {
            return;
          }
          
          // No entrar a NgZone inmediatamente para evitar storm de Change Detection
          this.handleMessage(msg);
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
        this.ngZone.run(() => {
          const lista = msg.payload as ColaboradorDTO[];
          this.colaboradores.set(lista);
        });
        break;
      case 'NODE_MOVED':
      case 'CURSOR_MOVED':
        // Eventos de alta frecuencia: procesar fuera de NgZone (via Subject)
        this.highFreqUpdates$.next(msg);
        break;
      case 'NODE_EDITING':
      case 'POLICY_UPDATED':
        // Cambios de estado pesados: entrar a NgZone para actualizar la señal y UI
        this.ngZone.run(() => {
          this.nodeUpdates.set(msg);
        });
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

  // ── Métodos para Colaboración de Documentos Colaborativos ──

  conectarDocRoom(docId: string) {
    if (this.currentDocRoom === docId) return;
    this.desconectarDocRoom();
    this.currentDocRoom = docId;

    const me = this.getMe();
    const token = this.authSvc.getToken();

    this.clientDoc = new Client({
      brokerURL: environment.wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectHeaders: token ? { 'Authorization': `Bearer ${token}` } as StompHeaders : {},
      debug: (str) => {}
    });

    this.clientDoc.onWebSocketClose = (evt) => {
      console.warn('⚠️ [WebSocket-Doc] Conexión cerrada. Code:', evt.code);
    };

    this.clientDoc.onConnect = () => {
      console.log('🔗 [Colaboración-Doc] Conectado a sala:', docId);
      
      this.clientDoc?.subscribe('/topic/documento/' + docId, (message: Message) => {
        if (message.body) {
          const msg: SocketMessageDTO = JSON.parse(message.body);
          
          // Echo loop prevention
          if (msg.colaborador?.id === me.id) {
            return;
          }
          
          this.handleDocMessage(msg);
        }
      });

      this.clientDoc?.publish({
        destination: `/app/documento/${docId}/join`,
        body: JSON.stringify(me)
      });
    };

    this.ngZone.runOutsideAngular(() => {
      this.clientDoc?.activate();
    });
  }

  desconectarDocRoom() {
    if (this.clientDoc) {
      const me = this.getMe();
      try {
        if (this.clientDoc.connected && this.currentDocRoom) {
          this.clientDoc.publish({
            destination: `/app/documento/${this.currentDocRoom}/leave`,
            body: JSON.stringify(me)
          });
        }
      } catch (e) {
        console.warn('Error al enviar mensaje de salida del documento:', e);
      }

      // Desvincular callbacks para evitar reconexión o disparos de eventos asíncronos tardíos
      this.clientDoc.onConnect = () => {};
      this.clientDoc.onWebSocketClose = () => {};
      this.clientDoc.onStompError = () => {};
      this.clientDoc.deactivate();
      this.clientDoc = null;
    }
    this.currentDocRoom = null;
    this.colaboradoresDoc.set([]);
  }

  private handleDocMessage(msg: SocketMessageDTO) {
    switch (msg.type) {
      case 'ROOM_STATE':
        this.ngZone.run(() => {
          const lista = msg.payload as ColaboradorDTO[];
          this.colaboradoresDoc.set(lista);
        });
        break;
      case 'DOC_EDIT':
        this.docEdits$.next(msg);
        break;
      case 'DOC_CURSOR':
        this.docCursors$.next(msg);
        break;
      case 'DOC_LOG':
        this.docLogs$.next(msg);
        break;
      case 'YJS_UPDATE':
        this.yjsUpdates$.next(msg);
        break;
    }
  }

  notificarEdicionDoc(contenido: string) {
    this.docEditSubject.next(contenido);
  }

  notificarAccionDoc(actionText: string) {
    if (!this.clientDoc || !this.clientDoc.connected || !this.currentDocRoom) return;

    const msg: SocketMessageDTO = {
      type: 'DOC_LOG',
      colaborador: this.getMe(),
      payload: actionText
    };

    this.clientDoc.publish({
      destination: `/app/documento/${this.currentDocRoom}/log`,
      body: JSON.stringify(msg)
    });
  }

  private emitDocEdit(contenido: string) {
    if (!this.clientDoc || !this.clientDoc.connected || !this.currentDocRoom) return;

    const msg: SocketMessageDTO = {
      type: 'DOC_EDIT',
      colaborador: this.getMe(),
      payload: contenido
    };

    this.clientDoc.publish({
      destination: `/app/documento/${this.currentDocRoom}/edit`,
      body: JSON.stringify(msg)
    });
  }

  notificarCursorDoc(posicion: number) {
    this.docCursorSubject.next(posicion);
  }

  private emitDocCursor(posicion: number) {
    if (!this.clientDoc || !this.clientDoc.connected || !this.currentDocRoom) return;

    const msg: SocketMessageDTO = {
      type: 'DOC_CURSOR',
      colaborador: this.getMe(),
      payload: posicion
    };

    this.clientDoc.publish({
      destination: `/app/documento/${this.currentDocRoom}/cursor`,
      body: JSON.stringify(msg)
    });
  }

  enviarYjsUpdate(docId: string, syncType: string, base64Data: string) {
    if (!this.clientDoc || !this.clientDoc.connected) return;

    const msg: SocketMessageDTO = {
      type: 'YJS_UPDATE',
      colaborador: this.getMe(),
      payload: { syncType, base64Data }
    };

    this.clientDoc.publish({
      destination: `/app/documento/${docId}/edit`,
      body: JSON.stringify(msg)
    });
  }

  obtenerEditoresActivos(docId: string): Observable<ColaboradorDTO[]> {
    return this.http.get<ColaboradorDTO[]>(`${environment.apiUrl}/colaboracion/documento/${docId}/colaboradores`);
  }
}

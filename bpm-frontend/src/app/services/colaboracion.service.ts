import { Injectable, signal } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import { AuthService } from './auth.service';

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

@Injectable({
  providedIn: 'root'
})
export class ColaboracionService {
  private client: Client | null = null;
  private currentRoom: string | null = null;
  
  // Estado reactivo para la UI
  public colaboradores = signal<ColaboradorDTO[]>([]);
  public nodeUpdates = signal<SocketMessageDTO | null>(null);

  // Colores aleatorios para usuarios nuevos (si no traen)
  private colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

  constructor(private authSvc: AuthService) {}

  private getMe(): ColaboradorDTO {
    const user = this.authSvc.usuario();
    const name = user?.nombre || 'Usuario Desconocido';
    const id = user?.id || crypto.randomUUID(); // Fallback temporal si no hay user ID
    
    // Generar iniciales
    const parts = name.split(' ');
    const avatar = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
    
    // Asignar color según el ID para que sea consistente
    const colorIndex = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % this.colors.length;

    return {
      id: id,
      nombre: name,
      color: this.colors[colorIndex],
      avatar: avatar
    };
  }

  conectarRoom(politicaId: string) {
    if (this.currentRoom === politicaId) return; // Ya está conectado

    this.desconectar(); // Limpiar previa si existía
    this.currentRoom = politicaId;

    const me = this.getMe();

    this.client = new Client({
      brokerURL: 'ws://localhost:8080/ws-bpm',
      reconnectDelay: 5000,
      debug: (str) => {
        // console.log(str); // Quitar en prod
      }
    });

    this.client.onConnect = () => {
      console.log('🔗 [Colaboración] Conectado a sala:', politicaId);
      
      // Suscribirse a los mensajes de la sala
      this.client?.subscribe('/topic/politica/' + politicaId, (message: Message) => {
        if (message.body) {
          const msg: SocketMessageDTO = JSON.parse(message.body);
          this.handleMessage(msg);
        }
      });

      // Avisar al backend que entré
      this.client?.publish({
        destination: `/app/politica/${politicaId}/join`,
        body: JSON.stringify(me)
      });
    };

    this.client.activate();
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
        // Payload es la lista completa de colaboradores en la sala
        const lista = msg.payload as ColaboradorDTO[];
        // Ordenar para que "yo" siempre aparezca o no, o simplemente guardar la lista.
        this.colaboradores.set(lista);
        break;
      case 'NODE_EDITING':
      case 'NODE_MOVED':
      case 'POLICY_UPDATED':
        // Notificamos a los componentes suscritos (Designer)
        this.nodeUpdates.set(msg);
        break;
    }
  }

  notificarEdicionNodo(nodoId: string | null) {
    if (!this.client || !this.client.connected || !this.currentRoom) return;
    
    const msg: SocketMessageDTO = {
      type: 'NODE_EDITING',
      colaborador: this.getMe(),
      payload: nodoId // null significa que dejó de editar
    };
    
    this.client.publish({
      destination: `/app/politica/${this.currentRoom}/node-editing`,
      body: JSON.stringify(msg)
    });
  }

  notificarMovimientoNodo(nodoId: string, posX: number, posY: number) {
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

  /** Difunde el estado completo de la política a todos los colaboradores en la sala.
   *  Debe llamarse después de cualquier guardado (guardarPolitica) para sincronizar
   *  lanes, conexiones, colores, propiedades de nodos, etc.
   */
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
}

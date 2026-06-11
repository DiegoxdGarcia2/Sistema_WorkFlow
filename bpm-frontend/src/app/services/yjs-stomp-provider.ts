import * as Y from 'yjs';
import { Subscription } from 'rxjs';
import { ColaboracionService, SocketMessageDTO } from './colaboracion.service';
import * as awarenessProtocol from 'y-protocols/awareness';

export class YjsStompProvider {
  public doc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;
  private docId: string;
  private colSvc: ColaboracionService;
  private sub: Subscription | null = null;
  private connected = false;

  constructor(docId: string, doc: Y.Doc, colSvc: ColaboracionService) {
    this.docId = docId;
    this.doc = doc;
    this.colSvc = colSvc;
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    // Escuchar actualizaciones locales del documento y transmitirlas
    this.doc.on('update', this.onLocalUpdate);

    // Escuchar cambios de presencia local (cursores) y transmitirlos
    this.awareness.on('update', this.onLocalAwarenessUpdate);

    // Escuchar actualizaciones remotas desde el WebSocket
    this.sub = this.colSvc.yjsUpdates$.subscribe((msg: SocketMessageDTO) => {
      this.onRemoteMessage(msg);
    });

    this.connected = true;

    // Handshake inicial: Enviar vector de estado (SYNC_STEP_1)
    this.sendSyncStep1();
  }

  private onLocalUpdate = (update: Uint8Array, origin: any) => {
    // Si el origen de la actualización es este mismo proveedor, ignorar (evitar bucle eco)
    if (origin === this) {
      return;
    }

    const base64 = this.uint8ArrayToBase64(update);
    this.colSvc.enviarYjsUpdate(this.docId, 'UPDATE', base64);
  };

  private onLocalAwarenessUpdate = ({ added, updated, removed }: any) => {
    const changed = added.concat(updated).concat(removed);
    const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed);
    const base64 = this.uint8ArrayToBase64(update);
    this.colSvc.enviarYjsUpdate(this.docId, 'AWARENESS', base64);
  };

  private onRemoteMessage(msg: SocketMessageDTO) {
    if (!msg.payload) return;

    const { syncType, base64Data } = msg.payload;
    if (!syncType || !base64Data) return;

    const data = this.base64ToUint8Array(base64Data);

    if (syncType === 'SYNC_STEP_1') {
      // Un colaborador nos envió su vector de estado. Calculamos la diferencia y respondemos con SYNC_STEP_2
      const missingUpdate = Y.encodeStateAsUpdate(this.doc, data);
      const base64Missing = this.uint8ArrayToBase64(missingUpdate);
      this.colSvc.enviarYjsUpdate(this.docId, 'SYNC_STEP_2', base64Missing);
    } else if (syncType === 'SYNC_STEP_2' || syncType === 'UPDATE') {
      // Aplicar actualización de forma transaccional marcando el origen como este proveedor
      Y.applyUpdate(this.doc, data, this);
    } else if (syncType === 'AWARENESS') {
      // Aplicar estado de presencia del cursor remoto
      awarenessProtocol.applyAwarenessUpdate(this.awareness, data, this);
    }
  }

  private sendSyncStep1() {
    const stateVector = Y.encodeStateVector(this.doc);
    const base64 = this.uint8ArrayToBase64(stateVector);
    this.colSvc.enviarYjsUpdate(this.docId, 'SYNC_STEP_1', base64);
  }

  destroy() {
    this.doc.off('update', this.onLocalUpdate);
    this.awareness.off('update', this.onLocalAwarenessUpdate);
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.connected = false;
  }

  // Utilidades de conversión binario <--> Base64
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

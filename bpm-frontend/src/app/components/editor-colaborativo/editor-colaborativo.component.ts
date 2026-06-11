import { Component, OnInit, OnDestroy, inject, input, output, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import CharacterCount from '@tiptap/extension-character-count';
import * as Y from 'yjs';
import { Subscription } from 'rxjs';
import { ColaboracionService, ColaboradorDTO, SocketMessageDTO } from '../../services/colaboracion.service';
import { YjsStompProvider } from '../../services/yjs-stomp-provider';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { OnlineStatusService } from '../../services/online-status.service';
import { DocumentoBorradorService, DocumentoBorrador } from '../../services/documento-borrador.service';

// Extensión inline de FontSize
export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize,
            renderHTML: attributes => {
              if (!attributes['fontSize']) {
                return {};
              }
              return {
                style: `font-size: ${attributes['fontSize']}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .run();
      },
    } as any;
  },
});

@Component({
  selector: 'app-editor-colaborativo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-colaborativo.component.html',
  styleUrls: ['./editor-colaborativo.component.css']
})
export class EditorColaborativoComponent implements OnInit, OnDestroy {
  // Inputs usando la API de Angular 17+
  tramiteId = input.required<string>();
  readOnly = input<boolean>(false);

  // Outputs usando la API de Angular 17+
  onClose = output<void>();
  onSave = output<string>();

  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  // Inyecciones
  public colSvc = inject(ColaboracionService);
  private offlineDb = inject(OfflineStorageService);
  public onlineSvc = inject(OnlineStatusService);
  private draftSvc = inject(DocumentoBorradorService);

  // Instancias del Editor y Yjs
  editor!: Editor;
  ydoc!: Y.Doc;
  provider!: YjsStompProvider;

  // Estados reactivos
  cargando = signal(true);
  guardando = signal(false);
  toastMsg = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('success');
  borradorBackend: DocumentoBorrador | null = null;
  nombreBorrador = signal('Borrador de Trámite');

  // Seguimiento de último editor y fecha de edición
  ultimoEditor = signal<string>('Cargando...');
  ultimoCambio = signal<Date | null>(null);

  // Contadores de texto
  palabrasCount = signal(0);
  caracteresCount = signal(0);

  // Optimización de concurrencia: evitar guardados redundantes si no hay cambios
  tieneCambiosPendientes = false;

  // Estados reactivos para paleta de colores (tipo Word)
  mostrarColorTexto = signal(false);
  mostrarColorResaltado = signal(false);

  // Pantalla completa y Auditoría
  esPantallaCompleta = signal(false);
  mostrarAuditLog = signal(false);
  cargandoAuditoria = signal(false);
  historialAuditoria = signal<any[]>([]);

  coloresTema: string[] = [
    '#FFFFFF', '#000000', '#E2E8F0', '#1E293B', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
    '#F8FAFC', '#F3F4F6', '#F1F5F9', '#E2E8F0', '#DBEAFE', '#FEE2E2', '#D1FAE5', '#FEF3C7', '#EDE9FE', '#FCE7F3',
    '#F1F5F9', '#E5E7EB', '#CBD5E1', '#94A3B8', '#BFDBFE', '#FECACA', '#A7F3D0', '#FDE68A', '#DDD6FE', '#FBCFE8',
    '#E2E8F0', '#D1D5DB', '#94A3B8', '#64748B', '#93C5FD', '#FCA5A5', '#6EE7B7', '#FCD34D', '#C4B5FD', '#F9A8D4',
    '#94A3B8', '#4B5563', '#475569', '#334155', '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#DB2777',
    '#475569', '#1F2937', '#334155', '#0F172A', '#1E3A8A', '#7F1D1D', '#064E3B', '#78350F', '#4C1D95', '#701A75'
  ];

  coloresEstandar: string[] = [
    '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#002060', '#7030A0', '#FF00FF'
  ];

  coloresResaltado: string[] = [
    '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#0000FF',
    '#FF0000', '#000080', '#008080', '#008000', '#800080',
    '#800000', '#808000', '#808080', '#C0C0C0', '#000000'
  ];

  private subs = new Subscription();
  private saveInterval: any;

  // Obtener colaboradores incluyendo al usuario actual (marcado con "(Tú)")
  colaboradoresActivos = computed(() => {
    const list = this.colSvc.colaboradoresDoc();
    const myId = this.colSvc['getMe']().id;
    return list.map(c => ({
      ...c,
      nombre: c.id === myId ? `${c.nombre} (Tú)` : c.nombre
    }));
  });

  ngOnInit() {
    this.ydoc = new Y.Doc();

    // 1. Conectar WebSocket sala documento
    this.colSvc.conectarDocRoom(this.tramiteId());

    // 2. Crear el proveedor YjsStompProvider
    this.provider = new YjsStompProvider(this.tramiteId(), this.ydoc, this.colSvc);

    const me = this.colSvc['getMe']();

    // 3. Inicializar el editor de TipTap con extensiones de colaboración y atajos de teclado
    this.editor = new Editor({
      element: this.editorContainer.nativeElement,
      extensions: [
        StarterKit.configure({
          history: false, // Deshabilitar historial local ya que Yjs lo maneja de forma distribuida
        }),
        Collaboration.configure({
          document: this.ydoc,
        }),
        CollaborationCursor.configure({
          provider: this.provider as any,
          user: {
            name: me.nombre,
            color: me.color,
          },
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        FontFamily,
        FontSize,
        CharacterCount,
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-slate focus:outline-none max-w-[21cm] min-h-[29.7cm] bg-white text-slate-900 p-[2.5cm] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15),_0_8px_10px_-6px_rgba(0,0,0,0.15)] rounded-sm mx-auto my-8 border border-slate-200/50 outline-none',
        },
        // Mapeo manual de deshacer/rehacer colaborativo (Yjs UndoManager commands)
        handleKeyDown: (view, event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            this.editor.commands.undo();
            return true;
          }
          if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            this.editor.commands.redo();
            return true;
          }
          if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
            event.preventDefault();
            this.editor.commands.redo();
            return true;
          }
          return false;
        }
      },
      editable: !this.readOnly(),
    });

    setTimeout(() => {
      this.actualizarContadores();
    }, 200);

    // 4. Cargar borrador inicial
    this.cargarDatosBorrador();

    // 5. Suscribirse a cambios de conexión (Reconexión y Merge)
    this.subs.add(
      this.onlineSvc.statusChanges.subscribe((online) => {
        if (online) {
          this.sincronizarDeltasOffline();
        } else {
          this.showToast('Sin conexión a Internet. Editando de forma local.', 'info');
        }
      })
    );

    // 6. Bucle de guardado automático (Debounce / cada 5 segundos)
    this.saveInterval = setInterval(() => {
      this.guardarProgreso();
    }, 5000);

    // 7. Escuchar actualizaciones Yjs remotas para actualizar el último editor en tiempo real
    this.subs.add(
      this.colSvc.yjsUpdates$.subscribe((msg: SocketMessageDTO) => {
        if (msg.colaborador) {
          this.ultimoEditor.set(msg.colaborador.nombre);
          this.ultimoCambio.set(new Date());
        }
      })
    );

    // 8. Escuchar cambios locales en el editor para actualizar el último editor local y contadores
    this.editor.on('update', ({ transaction }) => {
      // Ignorar actualizaciones remotas de Yjs para evitar bucles de auto-guardado infinito
      const isRemote = transaction.getMeta('y-sync$') !== undefined;
      if (isRemote) return;

      const meUser = this.colSvc['getMe']();
      this.ultimoEditor.set(`${meUser.nombre} (Tú)`);
      this.ultimoCambio.set(new Date());
      this.actualizarContadores();
      this.tieneCambiosPendientes = true; // Marcar que hay cambios locales para auto-guardar
    });
  }

  async cargarDatosBorrador() {
    this.cargando.set(true);
    const tramiteId = this.tramiteId();

    if (this.onlineSvc.isOnline()) {
      this.draftSvc.getOrCreateDraft(tramiteId).subscribe({
        next: (res) => {
          this.borradorBackend = res;
          if (res.nombre) {
            this.nombreBorrador.set(res.nombre);
          }

          try {
            // Si el servidor nos devuelve un estado binario de Yjs guardado, lo aplicamos decodificando de forma segura
            if (res.estadoBinarioYjs) {
              let serverBytes: Uint8Array;
              if (typeof res.estadoBinarioYjs === 'string') {
                serverBytes = this.base64ToUint8Array(res.estadoBinarioYjs);
              } else if (Array.isArray(res.estadoBinarioYjs)) {
                serverBytes = new Uint8Array(res.estadoBinarioYjs);
              } else {
                serverBytes = new Uint8Array(Object.values(res.estadoBinarioYjs));
              }

              if (serverBytes.length > 0) {
                Y.applyUpdate(this.ydoc, serverBytes, this.provider);
                console.log('✅ [YJS] Aplicada actualización inicial del servidor');
              }
            } else if (res.contenidoHtml) {
              // Fallback si no hay binario pero hay HTML previo
              this.editor.commands.setContent(res.contenidoHtml);
            }
          } catch (err) {
            console.error('Error al aplicar actualización YJS inicial, aplicando HTML de respaldo:', err);
            if (res.contenidoHtml) {
              this.editor.commands.setContent(res.contenidoHtml);
            }
          }

          if (res.modificadoPor) {
            this.ultimoEditor.set(res.modificadoPor);
          }
          if (res.actualizadoEn) {
            this.ultimoCambio.set(new Date(res.actualizadoEn));
          }

          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando borrador desde el servidor', err);
          this.showToast('Error al conectar con el servidor. Cargando local...', 'error');
          this.cargarBorradorLocalFallback(tramiteId);
        }
      });
    } else {
      this.cargarBorradorLocalFallback(tramiteId);
    }
  }

  private async cargarBorradorLocalFallback(tramiteId: string) {
    const localDraft = await this.offlineDb.getDraft(tramiteId);
    if (localDraft) {
      try {
        const localBytes = this.base64ToUint8Array(localDraft.estadoBinarioYjsBase64);
        Y.applyUpdate(this.ydoc, localBytes, this.provider);
        this.showToast('Cargado borrador local (Offline)', 'info');
      } catch (e) {
        console.error('Error al cargar borrador local de respaldo', e);
        if (localDraft.contenidoHtml) {
          this.editor.commands.setContent(localDraft.contenidoHtml);
        }
      }
    } else {
      this.editor.commands.setContent('<p>Comienza a redactar el borrador aquí...</p>');
    }
    this.cargando.set(false);
  }

  async guardarProgreso() {
    if (this.readOnly() || !this.editor || !this.tieneCambiosPendientes) return;

    const html = this.editor.getHTML();
    const yjsUpdate = Y.encodeStateAsUpdate(this.ydoc);
    const yjsBase64 = this.uint8ArrayToBase64(yjsUpdate);
    const tramiteId = this.tramiteId();

    this.tieneCambiosPendientes = false; // Resetear antes de la llamada async para evitar duplicados en concurrencia

    // 1. Guardar en Dexie local para respaldo offline
    await this.offlineDb.saveDraft(tramiteId, html, yjsBase64);

    // 2. Si estamos online, persistir en la base de datos central
    if (this.onlineSvc.isOnline()) {
      this.guardando.set(true);
      this.draftSvc.saveDraft(tramiteId, html, yjsBase64, this.nombreBorrador()).subscribe({
        next: (res) => {
          this.borradorBackend = res;
          this.guardando.set(false);
        },
        error: (err) => {
          console.error('Error al guardar borrador en servidor', err);
          this.tieneCambiosPendientes = true; // Volver a habilitar en fallo
          this.guardando.set(false);
        }
      });
    }
  }

  async sincronizarDeltasOffline() {
    const tramiteId = this.tramiteId();
    const localDraft = await this.offlineDb.getDraft(tramiteId);
    if (!localDraft) return;

    this.cargando.set(true);
    // Recuperar el estado del servidor
    this.draftSvc.getOrCreateDraft(tramiteId).subscribe({
      next: async (res) => {
        // 1. Aplicar estado del servidor a nuestro ydoc
        if (res.estadoBinarioYjs && res.estadoBinarioYjs.length > 0) {
          const serverBytes = new Uint8Array(res.estadoBinarioYjs);
          Y.applyUpdate(this.ydoc, serverBytes, this.provider);
        }

        // 2. Aplicar el estado local acumulado (Dexie) al ydoc
        const localBytes = this.base64ToUint8Array(localDraft.estadoBinarioYjsBase64);
        Y.applyUpdate(this.ydoc, localBytes, this.provider);

        // 3. Obtener el estado unificado final
        const consolidatedUpdate = Y.encodeStateAsUpdate(this.ydoc);
        const consolidatedBase64 = this.uint8ArrayToBase64(consolidatedUpdate);
        const html = this.editor.getHTML();

        // 4. Enviar el borrador unificado al servidor
        this.draftSvc.saveDraft(tramiteId, html, consolidatedBase64, this.nombreBorrador()).subscribe({
          next: () => {
            this.cargando.set(false);
            this.showToast('Borrador offline sincronizado con el servidor', 'success');
            this.offlineDb.removeDraft(tramiteId); // Limpiar Dexie
          },
          error: (err) => {
            console.error('Error al subir borrador consolidado', err);
            this.cargando.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Error al sincronizar borrador offline', err);
        this.cargando.set(false);
      }
    });
  }

  // Acciones de Formato de la Barra de Herramientas
  formatBold() {
    this.editor.chain().focus().toggleBold().run();
  }

  formatItalic() {
    this.editor.chain().focus().toggleItalic().run();
  }

  formatUnderline() {
    this.editor.chain().focus().toggleUnderline().run();
  }

  formatBlockquote() {
    this.editor.chain().focus().toggleBlockquote().run();
  }

  formatHeading(level: 1 | 2) {
    this.editor.chain().focus().toggleHeading({ level }).run();
  }

  formatList(type: 'bullet' | 'ordered') {
    if (type === 'bullet') {
      this.editor.chain().focus().toggleBulletList().run();
    } else {
      this.editor.chain().focus().toggleOrderedList().run();
    }
  }

  formatCodeBlock() {
    this.editor.chain().focus().toggleCodeBlock().run();
  }

  alignText(alignment: 'left' | 'center' | 'right' | 'justify') {
    this.editor.chain().focus().setTextAlign(alignment).run();
  }

  changeFontFamily(event: Event) {
    const font = (event.target as HTMLSelectElement).value;
    if (font) {
      this.editor.chain().focus().setFontFamily(font).run();
    } else {
      this.editor.chain().focus().unsetFontFamily().run();
    }
  }

  changeFontSize(event: Event) {
    const size = (event.target as HTMLSelectElement).value;
    if (size) {
      (this.editor.chain().focus() as any).setFontSize(size).run();
    } else {
      (this.editor.chain().focus() as any).unsetFontSize().run();
    }
  }

  toggleColorTexto() {
    this.mostrarColorTexto.update(v => !v);
    this.mostrarColorResaltado.set(false);
  }

  toggleColorResaltado() {
    this.mostrarColorResaltado.update(v => !v);
    this.mostrarColorTexto.set(false);
  }

  toggleFullscreen() {
    this.esPantallaCompleta.update(v => !v);
  }

  toggleAuditLog() {
    const newVal = !this.mostrarAuditLog();
    this.mostrarAuditLog.set(newVal);
    if (newVal) {
      this.cargarAuditoria();
    }
  }

  cargarAuditoria() {
    this.cargandoAuditoria.set(true);
    this.draftSvc.getAuditLogs(this.tramiteId()).subscribe({
      next: (logs) => {
        this.historialAuditoria.set(logs);
        this.cargandoAuditoria.set(false);
      },
      error: (err) => {
        console.error('Error al cargar auditoría', err);
        this.cargandoAuditoria.set(false);
        this.showToast('Error al cargar historial de actividades', 'error');
      }
    });
  }

  cerrarMenusColor() {
    this.mostrarColorTexto.set(false);
    this.mostrarColorResaltado.set(false);
  }

  resetColor() {
    this.editor.chain().focus().unsetColor().run();
    this.cerrarMenusColor();
  }

  changeColor(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    if (color) {
      this.editor.chain().focus().setColor(color).run();
      this.cerrarMenusColor();
    }
  }

  setColor(color: string) {
    this.editor.chain().focus().setColor(color).run();
    this.cerrarMenusColor();
  }

  changeHighlight(event: Event) {
    const color = (event.target as HTMLInputElement).value;
    if (color) {
      this.editor.chain().focus().toggleHighlight({ color }).run();
      this.cerrarMenusColor();
    }
  }

  setHighlight(color: string) {
    this.editor.chain().focus().toggleHighlight({ color }).run();
    this.cerrarMenusColor();
  }

  clearHighlight() {
    this.editor.chain().focus().unsetHighlight().run();
  }

  actualizarContadores() {
    if (!this.editor) return;
    this.palabrasCount.set(this.editor.storage['characterCount'].words());
    this.caracteresCount.set(this.editor.storage['characterCount'].characters());
  }

  printDocument() {
    window.print();
  }

  undo() {
    this.editor.commands.undo();
  }

  redo() {
    this.editor.commands.redo();
  }

  isFormatActive(type: string | object, options?: any): boolean {
    if (!this.editor) return false;
    return this.editor.isActive(type as any, options);
  }
  // Guardado manual y Cierre
  async guardarYSalir() {
    this.cargando.set(true);
    this.tieneCambiosPendientes = true; // Forzar guardado de los últimos cambios
    await this.guardarProgreso();
    const html = this.editor.getHTML();
    this.onSave.emit(html);
    this.onClose.emit();
  }

  cambiarNombreBorrador() {
    if (this.readOnly()) return;
    const nuevoNombre = this.nombreBorrador().trim();
    if (!nuevoNombre) {
      this.nombreBorrador.set('Borrador de Trámite');
    }
    this.tieneCambiosPendientes = true;
    this.guardarProgreso();
  }

  publicarAS3() {
    if (this.readOnly()) return;
    this.cargando.set(true);
    
    // Primero nos aseguramos de guardar los últimos cambios
    this.tieneCambiosPendientes = true;
    this.guardarProgreso();

    this.draftSvc.publicarAS3(this.tramiteId()).subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.showToast('Documento compilado y subido a S3 con éxito.', 'success');
        setTimeout(() => {
          this.onClose.emit();
        }, 1500);
      },
      error: (err) => {
        console.error('Error al subir a S3:', err);
        this.cargando.set(false);
        this.showToast(err.error?.message || 'Error al compilar y subir a S3', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error' | 'info') {
    this.toastMsg.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMsg.set(null), 3000);
  }

  // Conversiones Base64
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

  ngOnDestroy() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.subs.unsubscribe();
    
    if (this.provider) {
      this.provider.destroy();
    }

    if (this.editor) {
      this.editor.destroy();
    }

    this.colSvc.desconectarDocRoom();
  }
}

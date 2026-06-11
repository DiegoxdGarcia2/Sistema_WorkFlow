import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';
import { AdminService, Departamento } from '../../services/admin.service';
import { FormularioService, FormularioTemplate } from '../../services/formulario.service';
import { FormBuilderComponent } from '../admin/form-builder.component';
import { ColaboracionService, SocketMessageDTO } from '../../services/colaboracion.service';
import { MlAnalysisService, AnalysisResult } from '../../services/ml-analysis.service';
import { AiAssistantService, AiAction, AiResponse } from '../../services/ai-assistant.service';
import { effect, signal, untracked } from '@angular/core';
import { DesignerCanvasComponent } from './components/designer-canvas.component';
import { PropertiesSidebarComponent } from './components/properties-sidebar.component';

export interface FormField { 
  key: string; 
  label: string; 
  type: string; 
  required: boolean; 
  options?: string[]; 
  validations: {
    min?: number;
    max?: number;
    pattern?: string;
    customMsg?: string;
  };
}

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, FormBuilderComponent, DesignerCanvasComponent, PropertiesSidebarComponent],
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css'],
})
export class DesignerComponent implements OnInit, OnDestroy {
  @ViewChild(DesignerCanvasComponent) canvas!: DesignerCanvasComponent;

  // ── Constants ──
  readonly LW = 270;   // lane width
  readonly NW = 210;   // node width
  readonly NH = 60;    // node height
  readonly NG = 80;    // node gap (increased for better auto-layout spacing)
  readonly TOP = 100;  // top offset (below lane header + toolbar)

  // ── Route ──
  projectId: string | null = null;
  projectName: string | null = null;

  // ── Policy State ──
  sel: PoliticaDTO | null = null;
  filteredPoliticas: PoliticaDTO[] = [];

  // ── Node Selection ──
  nodoSeleccionado: Actividad | null = null;
  editCalleIdx = 0;
  editActIdx = 0;
  activeTab: 'general' | 'estilo' | 'formulario' | 'conexiones' = 'general';

  // ── Collaboration State ──
  nodosBloqueados = signal<Record<string, { userId: string, color: string, nombre: string }>>({});

  // ── Lane Selection ──
  calleSeleccionada: Calle | null = null;
  calleSelIdx = -1;

  // ── Transition Selection ──
  transicionSeleccionada: Transicion | null = null;

  // ── Auto-save ──
  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  private autoSaveTimer: any = null;

  // ── Layout helpers kept for references ──
  nodePositions: Record<string, { x: number; y: number }> = {};
  mostrarFormManager = false;

  // ── Simulation & ML ──
  showRightPanel = true;
  isSimulating = false;
  activeSimNodes: string[] = [];
  simLog: string[] = [];
  
  showMlPanel = false;
  mlResult: AnalysisResult | null = null;
  mlFindingsMap = signal<Record<string, AnalysisResult['findings'][0]>>({});
  
  // ── History (Undo/Redo) ──
  historial: PoliticaDTO[] = [];
  historialIdx = -1;
  isAnalyzingMl = false;
  
  // ── AI Assistant ──
  showAiAssistant = false;
  aiInputText = '';
  isAiProcessing = false;
  isAiListening = false;
  aiDirectSend = true;

  // ── Connection Mode ──
  connMode = { active: false, tipo: 'SECUENCIAL' as TipoRuta, sourceId: null as string | null };

  // ── Form Builder ──
  formFields: FormField[] = [];

  // ── Modals ──
  mostrarModalCrear = false;
  errorCrear = '';

  // --- Optimizaciones de Rendimiento ---
  private nodeToLaneMap = new Map<string, number>(); // ActId -> LaneIndex
  private actividadesMap = new Map<string, Actividad>(); // ActId -> Actividad
  nuevaPolitica = { nombre: '', descripcion: '' };
  mostrarModalAddCalle = false;
  nuevaCalleNombre = '';
  nuevaCalleDeptoId = '';
  nuevaCalleColor = '#475569';
  mostrarConfirmEliminar = false;

  // ── Toast ──
  toastMsg = '';
  toastType: 'success' | 'error' | 'info' = 'success';

  // ── Palettes ──
  nodeColors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#475569','#10b981','#e11d48'];
  laneColors = ['#475569','#6366f1','#8b5cf6','#06b6d4','#22c55e','#f97316','#e11d48','#3b82f6'];
  connColors = ['#475569','#6366f1','#818cf8','#22c55e','#f97316','#ef4444','#8b5cf6','#06b6d4'];
  fontSizes = [{v:'sm',l:'S'},{v:'md',l:'M'},{v:'lg',l:'L'}];

  toolbox: { tipo: TipoActividad; label: string; desc: string; accent: string }[] = [
    { tipo: 'INICIO', label: 'Inicio', desc: 'Punto de inicio', accent: '#10b981' },
    { tipo: 'TAREA',  label: 'Tarea',  desc: 'Actividad / Acción', accent: '#6366f1' },
    { tipo: 'DECISION', label: 'Decisión', desc: 'Bifurcación lógica', accent: '#f59e0b' },
    { tipo: 'FORK',   label: 'Fork',   desc: 'Ejecución paralela', accent: '#a855f7' },
    { tipo: 'JOIN',   label: 'Join',   desc: 'Sincronización', accent: '#a855f7' },
    { tipo: 'FIN',    label: 'Fin',    desc: 'Punto final', accent: '#ef4444' },
  ];

  connectorTypes: { tipo: TipoRuta; label: string; desc: string; dash: string }[] = [
    { tipo: 'SECUENCIAL', label: 'Secuencial', desc: 'Flujo directo', dash: '' },
    { tipo: 'CONDICIONAL', label: 'Condicional', desc: 'Con condición', dash: '8 4' },
    { tipo: 'PARALELA', label: 'Paralela', desc: 'Flujo paralelo', dash: '4 4' },
  ];


  constructor(
    public politicaService: PoliticaService,
    public auth: AuthService,
    public adminSvc: AdminService,
    public fs: FormularioService,
    public colabSvc: ColaboracionService,
    public mlSvc: MlAnalysisService,
    public aiSvc: AiAssistantService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    // Escuchar eventos WebSocket remotos (señales reactivas)
    effect(() => {
      const msg = this.colabSvc.nodeUpdates();
      if (msg) untracked(() => this.procesarEventoRemoto(msg));
    }, { allowSignalWrites: true });

    // Escuchar cambios en la lista de colaboradores para liberar nodos bloqueados por usuarios que se desconectan
    effect(() => {
      const colaboradoresActivos = this.colabSvc.colaboradores();
      const activeUserIds = new Set(colaboradoresActivos.map(c => c.id));
      const currentBloqueados = this.nodosBloqueados();
      const newBloqueados = { ...currentBloqueados };
      let changed = false;
      
      for (const nodeId in newBloqueados) {
        if (!activeUserIds.has(newBloqueados[nodeId].userId)) {
          delete newBloqueados[nodeId];
          changed = true;
        }
      }
      
      if (changed) {
        this.nodosBloqueados.set(newBloqueados);
      }
    }, { allowSignalWrites: true });
  }

  private remoteUpdateDepth = 0;
  private get isRemoteUpdate(): boolean {
    return this.remoteUpdateDepth > 0;
  }

  procesarEventoRemoto(msg: SocketMessageDTO) {
    // Ignorar mis propios mensajes retransmitidos
    if (msg.colaborador.id === this.auth.usuario()?.id) return;

    this.remoteUpdateDepth++;
    try {
      if (msg.type === 'NODE_EDITING') {
      // msg.payload es el ID del nodo
      const nodeId = msg.payload as string | null;

      const currentBloqueados = { ...this.nodosBloqueados() };
      // Limpiar bloqueos previos de este usuario
      for (const key in currentBloqueados) {
        if (currentBloqueados[key].userId === msg.colaborador.id) {
          delete currentBloqueados[key];
        }
      }

      // Aplicar nuevo bloqueo si está editando algo
      if (nodeId) {
        currentBloqueados[nodeId] = {
          userId: msg.colaborador.id,
          color: msg.colaborador.color,
          nombre: msg.colaborador.nombre
        };
      }
      this.nodosBloqueados.set(currentBloqueados);

    } else if (msg.type === 'POLICY_UPDATED' && msg.payload && this.sel) {
      // Sincronización completa: lanes, conexiones, colores, propiedades, etc.
      const updated = msg.payload as PoliticaDTO;
      // Solo aplicar si es la misma política abierta
      if (updated.id === this.sel.id) {
        // Preservar selecciones para restaurarlas después
        const selNodeId = this.nodoSeleccionado?.id;
        const selTransId = this.transicionSeleccionada?.id;
        const selCalleId = this.calleSeleccionada?.id;

        this.sel = JSON.parse(JSON.stringify(updated));
        this.generateLayout();

        // Restaurar selecciones
        if (selNodeId) {
          for (let ci = 0; ci < this.sel!.calles.length; ci++) {
            const ai = this.sel!.calles[ci].actividades.findIndex(a => a.id === selNodeId);
            if (ai >= 0) { this.nodoSeleccionado = this.sel!.calles[ci].actividades[ai]; this.editCalleIdx = ci; this.editActIdx = ai; break; }
          }
        }
        if (selTransId) { this.transicionSeleccionada = this.sel!.transiciones.find(t => t.id === selTransId) || null; }
        if (selCalleId) {
          const ci = this.sel!.calles.findIndex(c => c.id === selCalleId);
          if (ci >= 0) { this.calleSeleccionada = this.sel!.calles[ci]; this.calleSelIdx = ci; }
        }

        this.showToast(`${msg.colaborador.nombre} actualizó el diagrama`, 'success');
      }
    }
    } catch (e) {
      console.error('Error procesando evento remoto:', e);
    } finally {
      // Retrasar el flag para absorber eventos ngModelChange disparados por la reconstrucción del DOM
      setTimeout(() => {
        this.remoteUpdateDepth--;
      }, 50);
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.projectId = p['projectId'] || null;
      this.projectName = p['projectName'] || null;
    });
    this.cargarPoliticas();
    const tid = this.auth.usuario()?.tenantId;
    if (tid) {
      this.adminSvc.cargarDepartamentos(tid).subscribe(deps => this.departamentos.set(deps));
      this.fs.listarPorTenant(tid).subscribe(data => this.templates.set(data));
    }
  }
templates = signal<FormularioTemplate[]>([]);
  departamentos = signal<Departamento[]>([]);
  
  ngOnDestroy(): void { 
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer); 
    this.colabSvc.desconectar();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.connMode.active) this.cancelConnMode();
    } else if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      this.undo();
    } else if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'Z'))) {
      event.preventDefault();
      this.redo();
    }
  }

  // ── Data ──
  cargarPoliticas(): void {
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;
    this.politicaService.listarPorTenant(tid).subscribe(pols => {
      if (this.projectId) {
        this.filteredPoliticas = pols.filter(p => p.proyectoId === this.projectId);
      } else {
        this.filteredPoliticas = pols.filter(p => !p.proyectoId);
      }
    });
  }

  goBack(): void { 
    this.colabSvc.desconectar();
    this.router.navigate(['/designer']); 
  }

  // ── Selection ──
  seleccionar(p: PoliticaDTO): void {
    this.colabSvc.conectarRoom(p.id); // Conectarse a WS
    
    // Re-fetch from server to get latest version
    this.politicaService.buscarPorId(p.id).subscribe({
      next: (fresh) => {
        this.sel = JSON.parse(JSON.stringify(fresh));
        this.nodoSeleccionado = null;
        this.colabSvc.notificarEdicionNodo(null);
        this.transicionSeleccionada = null;
        this.calleSeleccionada = null;
        this.generateLayout();
        
        // Inicializar historial con el estado fresco
        this.historial = [];
        this.historialIdx = -1;
        this.pushHistorial();
      },
      error: () => {
        // Fallback to cached version
        this.sel = JSON.parse(JSON.stringify(p));
        this.nodoSeleccionado = null;
        this.colabSvc.notificarEdicionNodo(null);
        this.transicionSeleccionada = null;
        this.calleSeleccionada = null;
        this.generateLayout();
      }
    });
  }

  contarNodos(p: PoliticaDTO): number { return p.calles.reduce((s, c) => s + c.actividades.length, 0); }

  // ── Layout Engine Delegate ──
  generateLayout(): void {
    if (this.canvas) {
      this.canvas.generateLayout();
    }
  }

  persistPositions(): void {
    if (this.canvas) {
      this.canvas.persistPositions();
    }
  }

  startConnMode(tipo: TipoRuta): void {
    this.connMode = { active: true, tipo, sourceId: null };
  }

  cancelConnMode(): void {
    this.connMode = { active: false, tipo: 'SECUENCIAL', sourceId: null };
  }

  onNodeChange(): void {
    this.generateLayout();
    this.broadcastPolicyState();
    this.triggerAutoSave();
  }

  resetAnchors(): void {
    if (!this.sel) return;
    this.pushHistorial();

    // 1. Mejorar el enrutamiento visual (curvas suaves bezier)
    this.sel.transiciones.forEach(t => {
      t.origenAnchor = 'auto';
      t.destinoAnchor = 'auto';
      t.enrutamiento = 'bezier';
    });

    // 2. Calcular profundidad topológica de cada nodo
    const depths = new Map<string, number>();
    const calcDepth = (nodeId: string, currentDepth: number, visited: Set<string>) => {
      if (visited.has(nodeId)) return; // Evitar ciclos infinitos
      visited.add(nodeId);
      
      const existing = depths.get(nodeId) || 0;
      if (currentDepth > existing) {
        depths.set(nodeId, currentDepth);
      }
      
      const outgoing = this.sel!.transiciones.filter(t => t.origenId === nodeId);
      outgoing.forEach(t => calcDepth(t.destinoId, currentDepth + 1, new Set(visited)));
    };

    const allNodes = this.sel.calles.flatMap(c => c.actividades);
    const roots = allNodes.filter(n => !this.sel!.transiciones.some(t => t.destinoId === n.id));
    roots.forEach(r => calcDepth(r.id, 0, new Set()));

    // 3. Ordenar nodos en sus calles y resetear posiciones para forzar snap de generateLayout()
    this.sel.calles.forEach(c => {
      c.actividades.sort((a, b) => {
        // Asegurar que Inicio vaya siempre arriba y Fin abajo
        if (a.tipo === 'INICIO') return -1;
        if (b.tipo === 'INICIO') return 1;
        if (a.tipo === 'FIN') return 1;
        if (b.tipo === 'FIN') return -1;
        
        const da = depths.get(a.id) || 0;
        const db = depths.get(b.id) || 0;
        return da - db;
      });

      c.actividades.forEach(a => {
        a.posX = undefined;
        a.posY = undefined;
      });
    });

    this.generateLayout();
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Diagrama auto-acomodado y optimizado', 'success');
  }

  // ── CRUD: Policy ──
  crearPolitica(): void {
    this.errorCrear = '';
    const tid = this.auth.usuario()?.tenantId;
    if (!tid || !this.nuevaPolitica.nombre.trim()) { this.errorCrear = 'El nombre es obligatorio.'; return; }
    const body: any = { tenantId: tid, nombre: this.nuevaPolitica.nombre, descripcion: this.nuevaPolitica.descripcion };
    if (this.projectId) body.proyectoId = this.projectId;
    this.politicaService.crear(body).subscribe({
      next: (created: PoliticaDTO) => { this.mostrarModalCrear = false; this.nuevaPolitica = { nombre: '', descripcion: '' }; this.cargarPoliticas(); this.seleccionar(created); this.showToast('Política creada', 'success'); },
      error: (e: any) => this.errorCrear = e.error?.message || 'Error al crear.',
    });
  }
  guardarPolitica(): void {
    if (!this.sel) return;
    this.persistPositions();
    this.saveStatus.set('saving');
    const selId = this.sel.id;
    const selNodeId = this.nodoSeleccionado?.id;
    const selTransId = this.transicionSeleccionada?.id;
    const selCalleId = this.calleSeleccionada?.id;
    this.politicaService.actualizar(this.sel.id, this.sel).subscribe({
      next: (u: PoliticaDTO) => {
        this.sel = JSON.parse(JSON.stringify(u));
        this.generateLayout();
        this.cargarPoliticas();
        // Restore selections after save
        if (selNodeId) {
          for (let ci = 0; ci < this.sel!.calles.length; ci++) {
            const ai = this.sel!.calles[ci].actividades.findIndex(a => a.id === selNodeId);
            if (ai >= 0) { this.nodoSeleccionado = this.sel!.calles[ci].actividades[ai]; this.editCalleIdx = ci; this.editActIdx = ai; break; }
          }
        }
        if (selTransId) { this.transicionSeleccionada = this.sel!.transiciones.find(t => t.id === selTransId) || null; }
        if (selCalleId) {
          const ci = this.sel!.calles.findIndex(c => c.id === selCalleId);
          if (ci >= 0) { this.calleSeleccionada = this.sel!.calles[ci]; this.calleSelIdx = ci; }
        }
        this.saveStatus.set('saved');
        setTimeout(() => { if (this.saveStatus() === 'saved') this.saveStatus.set('idle'); }, 2000);
      },
      error: (e: any) => { 
        this.saveStatus.set('error');
        this.showToast(e.error?.message || 'Error al guardar', 'error'); 
      },
    });
  }

  triggerAutoSave(): void {
    if (!this.sel || this.sel.estaActiva) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    
    this.saveStatus.set('saving');
    this.autoSaveTimer = setTimeout(() => this.guardarPolitica(), 400); // Reducido de 800ms a 400ms
  }

  // ── History (Undo/Redo) ──
  pushHistorial(): void {
    if (!this.sel || this.sel.estaActiva) return;
    // Si estamos navegando el historial y hacemos un cambio, descartamos el 'futuro'
    if (this.historialIdx < this.historial.length - 1) {
      this.historial = this.historial.slice(0, this.historialIdx + 1);
    }
    // Guardar copia profunda del estado actual
    this.historial.push(JSON.parse(JSON.stringify(this.sel)));
    if (this.historial.length > 50) {
      this.historial.shift();
    }
    this.historialIdx = this.historial.length - 1;
  }

  undo(): void {
    if (this.historialIdx > 0) {
      this.historialIdx--;
      this.restoreSnapshot(this.historial[this.historialIdx]);
    }
  }

  redo(): void {
    if (this.historialIdx < this.historial.length - 1) {
      this.historialIdx++;
      this.restoreSnapshot(this.historial[this.historialIdx]);
    }
  }

  private restoreSnapshot(snapshot: PoliticaDTO): void {
    this.sel = JSON.parse(JSON.stringify(snapshot));
    this.nodoSeleccionado = null;
    this.calleSeleccionada = null;
    this.transicionSeleccionada = null;
    this.generateLayout();
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Estado restaurado', 'info');
  }

  /** Difunde el estado completo a todos los colaboradores con un pequeño debounce
   *  para evitar saturar el socket en cambios rápidos. */
  private broadcastTimer: any = null;
  broadcastPolicyState(): void {
    if (this.isRemoteUpdate) return; // NUNCA emitir si estamos aplicando un cambio remoto
    if (!this.sel) return;

    if (this.broadcastTimer) clearTimeout(this.broadcastTimer);
    this.broadcastTimer = setTimeout(() => {
      if (this.sel) {
        this.colabSvc.notificarCambioCompleto(this.sel);
      }
    }, 150); // 150ms de gracia para acumular cambios rápidos
  }



  // ── Siguiente version calculada desde todas las versiones del mismo nombre ──
  get siguienteVersion(): number {
    if (!this.sel) return 1;
    const mismasVersiones = this.filteredPoliticas.filter(p => p.nombre === this.sel!.nombre);
    if (mismasVersiones.length === 0) return this.sel.version + 1;
    return Math.max(...mismasVersiones.map(p => p.version)) + 1;
  }

  // ── Crear nueva version a partir de cualquier version seleccionada ──
  crearNuevaVersion(): void {
    if (!this.sel) return;
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;
    const nextVer = this.siguienteVersion;
    const body: any = {
      tenantId: tid,
      nombre: this.sel.nombre,
      descripcion: this.sel.descripcion,
      version: nextVer,
      calles: JSON.parse(JSON.stringify(this.sel.calles)),
      transiciones: JSON.parse(JSON.stringify(this.sel.transiciones)),
    };
    if (this.sel.proyectoId) body.proyectoId = this.sel.proyectoId;
    this.politicaService.crear(body).subscribe({
      next: (created: PoliticaDTO) => {
        this.cargarPoliticas();
        this.seleccionar(created);
        this.showToast(`Version ${nextVer} creada como borrador`, 'success');
      },
      error: (e: any) => this.showToast(e.error?.message || 'Error al crear version', 'error'),
    });
  }
  activarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.activar(this.sel.id).subscribe({
      next: (u: PoliticaDTO) => { this.sel = JSON.parse(JSON.stringify(u)); this.cargarPoliticas(); this.showToast('Política publicada', 'success'); },
      error: (e: any) => this.showToast(e.error?.message || 'Error al activar', 'error'),
    });
  }
  confirmarEliminar(): void { this.mostrarConfirmEliminar = true; }
  eliminarPolitica(): void {
    if (!this.sel) return;
    const force = this.sel.estaActiva === true; // force-delete if LIVE
    this.politicaService.eliminar(this.sel.id, force).subscribe({
      next: () => { this.sel = null; this.nodoSeleccionado = null; this.mostrarConfirmEliminar = false; this.cargarPoliticas(); this.showToast('Política eliminada', 'success'); },
      error: (e: any) => { this.mostrarConfirmEliminar = false; this.showToast(e.error?.message || 'Error al eliminar', 'error'); },
    });
  }

  // ── CRUD: Calles ──
  agregarCalle(): void {
    if (!this.sel) return;
    this.pushHistorial();
    const depto = this.adminSvc.departamentos().find(d => d.id === this.nuevaCalleDeptoId);
    const nombre = this.nuevaCalleNombre.trim() || depto?.nombre || 'Nueva Calle';
    
    this.sel.calles.push({ 
      id: crypto.randomUUID(), 
      nombre, 
      departamentoId: this.nuevaCalleDeptoId,
      orden: this.sel.calles.length, 
      color: this.nuevaCalleColor, 
      actividades: [] 
    });
    
    this.nuevaCalleNombre = '';
    this.nuevaCalleDeptoId = '';
    this.nuevaCalleColor = '#475569';
    this.mostrarModalAddCalle = false;
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast('Calle añadida', 'success');
  }
  eliminarCalle(ci: number): void {
    if (!this.sel) return;
    this.pushHistorial();
    const removedIds = this.sel.calles[ci].actividades.map(a => a.id);
    this.sel.transiciones = this.sel.transiciones.filter(t => !removedIds.includes(t.origenId) && !removedIds.includes(t.destinoId));
    this.sel.calles.splice(ci, 1);
    this.nodoSeleccionado = null;
    if (this.calleSeleccionada && this.calleSelIdx === ci) this.calleSeleccionada = null;
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast('Calle eliminada', 'success');
  }

  // ── Documentos Requeridos y Prerrequisitos ──
  agregarDocumentoRequerido(val: string): void {
    if (!this.nodoSeleccionado) return;
    const trimmed = val.trim();
    if (!trimmed) return;
    this.pushHistorial();
    if (!this.nodoSeleccionado.documentosRequeridos) {
      this.nodoSeleccionado.documentosRequeridos = [];
    }
    this.nodoSeleccionado.documentosRequeridos.push(trimmed);
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Documento requerido añadido', 'success');
  }

  eliminarDocumentoRequerido(idx: number): void {
    if (!this.nodoSeleccionado || !this.nodoSeleccionado.documentosRequeridos) return;
    this.pushHistorial();
    this.nodoSeleccionado.documentosRequeridos.splice(idx, 1);
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Documento requerido eliminado', 'success');
  }

  getCleanReqName(req: string): string {
    if (!req) return '';
    return req.replace(/^\[(Texto|Número|Fecha|Archivo|Selección)\]\s*/i, '');
  }

  getReqType(req: string): string {
    if (!req) return 'archivo';
    const match = req.match(/^\[(Texto|Número|Fecha|Archivo|Selección)\]/i);
    return match ? match[1].toLowerCase() : 'archivo';
  }

  agregarRequisitoInicial(val: string): void {
    this.agregarRequisitoInicialConTipo('[Archivo]', val);
  }

  agregarRequisitoInicialConTipo(prefix: string, val: string): void {
    if (!this.sel) return;
    const trimmed = val.trim();
    if (!trimmed) return;
    this.pushHistorial();
    if (!this.sel.requisitosIniciales) {
      this.sel.requisitosIniciales = [];
    }
    // Formatear requisito con su tipo, ej: [Texto] Dirección
    const formatted = `${prefix} ${trimmed}`;
    
    // Verificar si ya existe (sin importar el prefijo)
    const exists = this.sel.requisitosIniciales.some(r => this.getCleanReqName(r).toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      this.showToast('Ya existe un requisito con ese nombre', 'error');
      return;
    }

    this.sel.requisitosIniciales = [...this.sel.requisitosIniciales, formatted];
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Requisito inicial añadido', 'success');
  }

  cargarRequisitosDesdePlantilla(templateId: string): void {
    if (!this.sel || !templateId) return;
    const t = this.templates().find(x => x.id === templateId);
    if (!t) return;

    this.pushHistorial();
    if (!this.sel.requisitosIniciales) {
      this.sel.requisitosIniciales = [];
    }

    const reqs = [...this.sel.requisitosIniciales];
    let count = 0;
    t.campos.forEach(c => {
      const label = c.label.trim();
      if (!label) return;

      // Traducir tipo
      let prefix = '[Texto]';
      if (c.type === 'file') prefix = '[Archivo]';
      else if (c.type === 'number') prefix = '[Número]';
      else if (c.type === 'date') prefix = '[Fecha]';
      else if (c.type === 'select') prefix = '[Selección]';

      const formatted = `${prefix} ${label}`;

      // Verificar si ya existe
      const exists = reqs.some(r => this.getCleanReqName(r).toLowerCase() === label.toLowerCase());
      if (!exists) {
        reqs.push(formatted);
        count++;
      }
    });

    this.sel.requisitosIniciales = reqs;
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast(`Se cargaron ${count} requisitos de la plantilla "${t.nombre}"`, 'success');
  }

  eliminarRequisitoInicial(idx: number): void {
    if (!this.sel || !this.sel.requisitosIniciales) return;
    this.pushHistorial();
    const reqs = [...this.sel.requisitosIniciales];
    reqs.splice(idx, 1);
    this.sel.requisitosIniciales = reqs;
    this.broadcastPolicyState();
    this.triggerAutoSave();
    this.showToast('Requisito inicial eliminado', 'success');
  }

  // ── CRUD: Nodos ──
  agregarNodo(tipo: TipoActividad): void {
    if (!this.sel || this.sel.estaActiva) return;
    if (this.sel.calles.length === 0) { this.showToast('Crea una calle primero', 'error'); return; }
    this.pushHistorial();
    let ci = this.calleSelIdx >= 0 ? this.calleSelIdx : 0;
    if (ci >= this.sel.calles.length) ci = 0;

    const names: Record<string, string> = { INICIO: 'Inicio', TAREA: 'Nueva Tarea', DECISION: 'Decisión', FORK: 'Fork', JOIN: 'Join', FIN: 'Fin', MERGE: 'Merge' };
    const newAct: Actividad = { 
      id: crypto.randomUUID(), 
      nombre: names[tipo] || 'Nodo', 
      tipo, 
      esInicial: tipo === 'INICIO', 
      esFinal: tipo === 'FIN', 
      orden: this.sel.calles[ci].actividades.length, 
      ancho: this.NW, 
      alto: this.NH, 
      fontSize: 'md',
      posX: undefined,
      posY: undefined
    };
    this.sel.calles[ci].actividades.push(newAct);
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast(`Nodo ${tipo} añadido`, 'success');
  }
  eliminarNodoSeleccionado(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
    this.pushHistorial();
    const id = this.nodoSeleccionado.id;
    this.sel.calles[this.editCalleIdx].actividades.splice(this.editActIdx, 1);
    this.sel.transiciones = this.sel.transiciones.filter(t => t.origenId !== id && t.destinoId !== id);
    this.nodoSeleccionado = null;
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast('Nodo eliminado', 'success');
  }

  // ── CRUD: Transiciones ──
  eliminarTransicionById(id: string): void {
    if (!this.sel) return;
    this.pushHistorial();
    this.sel.transiciones = this.sel.transiciones.filter(t => t.id !== id);
    if (this.transicionSeleccionada?.id === id) this.transicionSeleccionada = null;
    this.triggerAutoSave();
    this.showToast('Conexión eliminada', 'success');
  }

  // ── Form Builder ──
  loadFormFields(): void {
    if (!this.nodoSeleccionado?.esquemaFormulario) { this.formFields = []; return; }
    const fields = (this.nodoSeleccionado.esquemaFormulario as any).fields || [];
    // Asegurar que tengan el objeto validations inicializado para ngModel
    this.formFields = fields.map((f: any) => ({
      ...f,
      validations: f.validations || {}
    }));
  }
  addFormField(): void {
    this.formFields.push({ 
      key: `field_${Date.now()}`, 
      label: '', 
      type: 'text', 
      required: false,
      validations: {
        min: undefined,
        max: undefined
      } 
    });
    this.saveFormFields();
    this.triggerAutoSave();
  }
  removeFormField(i: number): void { 
    this.formFields.splice(i, 1);
    this.saveFormFields();
    this.triggerAutoSave();
  }
  saveFormFields(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
    const act = this.sel.calles[this.editCalleIdx].actividades[this.editActIdx];
    act.esquemaFormulario = { fields: [...this.formFields] };
  }

  // ── Helpers ──
  getAllActividades(): Actividad[] { return this.sel?.calles.flatMap(c => c.actividades) || []; }
  getNombreActividad(id: string): string {
    for (const c of this.sel?.calles || []) { const a = c.actividades.find(a => a.id === id); if (a) return a.nombre; }
    return id.substring(0, 8);
  }
  getAccent(t: string): string { return ({ INICIO: '#10b981', FIN: '#ef4444', TAREA: '#6366f1', DECISION: '#f59e0b', FORK: '#a855f7', JOIN: '#a855f7' } as any)[t] || '#64748b'; }
  getAccentBg(t: string): string { return this.getAccent(t) + '18'; }
  getCategory(t: string): string { return ({ INICIO: 'TRIGGER', FIN: 'END', TAREA: 'ACTION', DECISION: 'LOGIC', FORK: 'PARALLEL', JOIN: 'SYNC' } as any)[t] || 'NODE'; }

  trackById(index: number, item: any): string { return item.id; }
  trackByConnId(index: number, item: any): string { return item.id; }

  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMsg = msg; this.toastType = type;
    setTimeout(() => this.toastMsg = '', 3000);
  }

  getSalidasNodo(nodeId: string): Transicion[] {
    if (!this.sel) return [];
    return this.sel.transiciones.filter(t => t.origenId === nodeId);
  }

  getNombreNodo(nodeId: string): string {
    if (!this.sel) return 'Desconocido';
    for (const c of this.sel.calles) {
      const a = c.actividades.find(act => act.id === nodeId);
      if (a) return a.nombre;
    }
    return 'Desconocido';
  }

  eliminarTransicion(id: string): void {
    if (!this.sel) return;
    this.sel.transiciones = this.sel.transiciones.filter(t => t.id !== id);
    this.triggerAutoSave();
  }



  // ── Simulation Logic ──
  startSimulation(): void {
    const politica = this.sel;
    if (!politica) return;
    
    this.isSimulating = true;
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
    this.calleSeleccionada = null;
    this.activeSimNodes = [];
    this.simLog = ['Simulación y Análisis iniciados...'];
    this.showMlPanel = true;
    this.isAnalyzingMl = true;
    
    // Ejecutar ML Analysis en backend
    this.mlSvc.analyze(politica).subscribe({
      next: (res) => {
        this.mlResult = res;
        // Cachear hallazgos en un mapa para acceso O(1) en el template
        const map: Record<string, AnalysisResult['findings'][0]> = {};
        res.findings.forEach(f => map[f.nodeId] = f);
        this.mlFindingsMap.set(map);
        
        this.isAnalyzingMl = false;
        
        const hasCritical = res.findings.some(f => f.severity === 'CRITICAL');
        if (!hasCritical) {
          this.mlSvc.simulate(politica, 1000).subscribe(simRes => {
            if (this.mlResult) this.mlResult.simulation = simRes;
          });
        }
      },
      error: () => {
        this.isAnalyzingMl = false;
        this.showToast('Error en análisis ML', 'error');
      }
    });

    const inicio = this.getAllActividades().find(a => a.tipo === 'INICIO');
    if (inicio) {
      this.activeSimNodes = [inicio.id];
    }
  }

  stopSimulation(): void {
    this.isSimulating = false;
    this.showMlPanel = false;
    this.activeSimNodes = [];
    this.simLog = [];
  }

  avanzarSimulacion(nodeId: string): void {
    if (!this.isSimulating || !this.sel) return;
    
    const act = this.getAllActividades().find(a => a.id === nodeId);
    if (!act || !this.activeSimNodes.includes(nodeId)) return;

    const trans = this.sel.transiciones.filter(t => t.origenId === nodeId);
    
    if (trans.length === 0) {
      if (act.tipo === 'FIN') {
        this.simLog.push(`✓ ${act.nombre}: Flujo completado.`);
        this.activeSimNodes = this.activeSimNodes.filter(id => id !== nodeId);
        // Auto-stop after a small delay if no nodes left
        if (this.activeSimNodes.length === 0) {
          setTimeout(() => {
            if (confirm('Simulación terminada con éxito. ¿Deseas salir?')) {
               this.stopSimulation();
            }
          }, 800);
        }
      } else {
        this.simLog.push(`! ${act.nombre}: No tiene conexiones de salida.`);
      }
      return;
    }

    if (act.tipo === 'DECISION') {
      this.simLog.push(`? ${act.nombre}: Esperando decisión manual...`);
      return;
    }

    // Move forward automatically if not a decision
    const nextIds = trans.map(t => t.destinoId);
    this.activeSimNodes = [...this.activeSimNodes.filter(id => id !== nodeId), ...nextIds];
    
    nextIds.forEach(nid => {
      const nextAct = this.getNombreNodo(nid);
      this.simLog.push(`${act.nombre} → ${nextAct}`);
      
      // Recursive auto-advance for technical nodes (FORK, JOIN, MERGE)
      const targetAct = this.getAllActividades().find(a => a.id === nid);
      if (targetAct && (targetAct.tipo === 'FORK' || targetAct.tipo === 'JOIN' || targetAct.tipo === 'MERGE')) {
        setTimeout(() => this.avanzarSimulacion(nid), 600);
      }
    });
  }

  pickSimPath(transId: string): void {
    const t = this.sel?.transiciones.find(x => x.id === transId);
    if (!t) return;
    
    // Remove the source node from active and add the target
    this.activeSimNodes = [...this.activeSimNodes.filter(id => id !== t.origenId), t.destinoId];
    this.simLog.push(`Decisión: [${t.etiqueta || 'Siguiente'}] → ${this.getNombreNodo(t.destinoId)}`);
    
    // Recursive auto-advance if target is technical node
    const targetAct = this.getAllActividades().find(a => a.id === t.destinoId);
    if (targetAct && (targetAct.tipo === 'FORK' || targetAct.tipo === 'JOIN' || targetAct.tipo === 'MERGE')) {
      setTimeout(() => this.avanzarSimulacion(t.destinoId), 600);
    }
  }

  // --- FORM TEMPLATE HANDLING ---
  cargarPlantilla(templateId: string) {
    if (!this.nodoSeleccionado) return;
    const t = this.templates().find(x => x.id === templateId);
    if (!t) return;

    // Snapshot of fields
    const fields = t.campos.map(c => ({
      key: c.key,
      label: c.label,
      type: c.type,
      required: c.required,
      options: c.options ? [...c.options] : undefined,
      validations: c.validations ? { ...c.validations } : {}
    }));

    this.nodoSeleccionado.plantillaId = t.id;
    this.nodoSeleccionado.esquemaFormulario = { fields };
    this.formFields = fields;
    this.onNodeChange();
  }

  // ── AI Assistant ──
  toggleAiAssistant() {
    this.showAiAssistant = !this.showAiAssistant;
    if (!this.showAiAssistant && this.isAiListening) {
      this.stopAiListening();
    }
  }

  isAiInitializing = false;

  async startAiListening() {
    if (this.isAiInitializing) return;
    this.isAiInitializing = true;
    this.isAiListening = true;
    
    try {
      await this.aiSvc.empezarAEscuchar(
        (text, isFinal) => {
          this.isAiInitializing = false;
          this.aiInputText = text;
          if (isFinal) {
            this.stopAiListening();
            if (this.aiDirectSend) {
              this.enviarInstruccionAi();
            }
          }
          this.cdr.detectChanges();
        },
        (err) => {
          console.error('Error de voz:', err);
          this.isAiInitializing = false;
          this.stopAiListening();
          this.showToast('Error: ' + err, 'error');
          this.cdr.detectChanges();
        },
        () => {
          this.isAiInitializing = false;
          this.isAiListening = false;
          this.cdr.detectChanges();
        }
      );
    } catch (e) {
      this.isAiInitializing = false;
      this.isAiListening = false;
      this.cdr.detectChanges();
    }
  }

  stopAiListening() {
    if (this.isAiInitializing) return;
    this.aiSvc.detenerEscucha();
    this.isAiListening = false;
    this.isAiInitializing = false;
  }

  enviarInstruccionAi() {
    if (!this.aiInputText.trim() || !this.sel) return;
    this.isAiProcessing = true;
    const instruccion = this.aiInputText;
    this.aiInputText = '';

    const todasActividades = this.getAllActividades();
    const contextoLimpio = {
      nodos: this.sel.calles.flatMap((c: any) => c.actividades.map((a: any) => ({ nombre: a.nombre, tipo: a.tipo, calleNombre: c.nombre }))),
      conexiones: this.sel.transiciones.map((c: any) => {
        const o = todasActividades.find((n: any) => n.id === c.origenId);
        const d = todasActividades.find((n: any) => n.id === c.destinoId);
        return { origen: o ? o.nombre : c.origenId, destino: d ? d.nombre : c.destinoId };
      }),
      calles: this.sel.calles.map((c: any) => ({ nombre: c.nombre }))
    };

    this.aiSvc.ejecutarComando(this.sel.id, instruccion, contextoLimpio).subscribe({
      next: (res: AiResponse) => {
        console.log('[AiAssistant] Respuesta AI:', res);
        this.isAiProcessing = false;
        this.showToast('AI: ' + res.explicacion, 'info');
        this.aiSvc.hablar(res.explicacion);
        
        // Ejecutar las acciones
        if (res.acciones && res.acciones.length > 0) {
          console.log('[AiAssistant] Ejecutando acciones:', res.acciones);
          for (const acc of res.acciones) {
            this.ejecutarAccionAi(acc);
          }
          // Guardar en el historial DESPUÉS de aplicar todas las acciones de la IA
          this.pushHistorial();
          
          this.generateLayout();
          this.triggerAutoSave();
          this.broadcastPolicyState();
          this.cdr.detectChanges();
        }
      },
      error: (e: any) => {
        this.isAiProcessing = false;
        this.showToast('Error con la IA: ' + (e.error?.message || e.message), 'error');
      }
    });
  }

  private ejecutarAccionAi(acc: AiAction) {
    const sel = this.sel;
    if (!sel) return;
    try {
      switch (acc.tipo) {
        case 'NOT_SUPPORTED': {
          this.showToast(acc.params.razon || 'Acción no soportada en el diseñador', 'info');
          break;
        }
        case 'CREAR_CALLE': {
          sel.calles.push({
            id: crypto.randomUUID(),
            nombre: acc.params.nombre || 'Nueva Calle',
            departamentoId: '',
            color: acc.params.color || '#475569',
            orden: sel.calles.length,
            actividades: []
          });
          break;
        }
        case 'CREAR_NODO': {
          let calleIdx = 0;
          if (acc.params.calleNombre) {
            const idx = sel.calles.findIndex(c => c.nombre.toLowerCase().includes((acc.params.calleNombre as string).toLowerCase()));
            if (idx >= 0) calleIdx = idx;
          }
          
          if (sel.calles.length === 0) {
            sel.calles.push({ id: crypto.randomUUID(), nombre: 'Defecto', departamentoId: '', orden: 0, color: '#475569', actividades: [] });
          }
          
          const tipo: TipoActividad = acc.params.tipo || 'TAREA';
          const newAct: Actividad = {
            id: crypto.randomUUID(),
            nombre: acc.params.nombre || 'Nueva Tarea',
            tipo,
            esInicial: tipo === 'INICIO',
            esFinal: tipo === 'FIN',
            orden: sel.calles[calleIdx].actividades.length,
            ancho: this.NW, 
            alto: this.NH, 
            fontSize: 'md',
            posX: undefined,
            posY: undefined
          };
          sel.calles[calleIdx].actividades.push(newAct);
          break;
        }
        case 'CONECTAR_NODOS': {
          const oName = (acc.params.origenNombre as string || '').toLowerCase();
          const dName = (acc.params.destinoNombre as string || '').toLowerCase();
          
          let oNode: Actividad | null = null;
          let dNode: Actividad | null = null;
          for (const c of sel.calles) {
            for (const a of c.actividades) {
              if (a.nombre.toLowerCase().includes(oName)) oNode = a;
              if (a.nombre.toLowerCase().includes(dName)) dNode = a;
            }
          }
          if (oNode && dNode) {
            sel.transiciones.push({
              id: crypto.randomUUID(), origenId: oNode.id, destinoId: dNode.id,
              tipoRuta: acc.params.tipo || 'SECUENCIAL', condicion: '', etiqueta: '', prioridad: 0,
              color: '#475569', tipoLinea: 'solida', grosor: 2,
              origenAnchor: 'auto', destinoAnchor: 'auto', enrutamiento: 'bezier'
            });
          }
          break;
        }
        case 'ELIMINAR_NODO': {
          const nName = (acc.params.nombre as string || '').toLowerCase().trim();
          if (!nName) break;
          for (const c of sel.calles) {
            const idx = c.actividades.findIndex(a => a.nombre.toLowerCase().includes(nName));
            if (idx >= 0) {
              const id = c.actividades[idx].id;
              c.actividades.splice(idx, 1);
              sel.transiciones = sel.transiciones.filter(t => t.origenId !== id && t.destinoId !== id);
            }
          }
          break;
        }
        case 'MODIFICAR_NODO': {
          const oldName = (acc.params.nombreActual as string || '').toLowerCase();
          const newName = acc.params.nuevoNombre as string || 'Nodo Renombrado';
          
          for (const c of sel.calles) {
            const act = c.actividades.find(a => a.nombre.toLowerCase().includes(oldName));
            if (act) {
              act.nombre = newName;
              break;
            }
          }
          break;
        }
        case 'ELIMINAR_CALLE': {
          const cName = (acc.params.nombre as string || '').toLowerCase().trim();
          if (!cName) break;
          const idx = sel.calles.findIndex(c => c.nombre.toLowerCase().includes(cName));
          if (idx >= 0) {
            const lane = sel.calles[idx];
            const nodeIds = lane.actividades.map(a => a.id);
            sel.transiciones = sel.transiciones.filter(t => !nodeIds.includes(t.origenId) && !nodeIds.includes(t.destinoId));
            sel.calles.splice(idx, 1);
          }
          break;
        }
        case 'MOVER_NODO': {
          const nName = (acc.params.nombreNodo || acc.params.nombre || '').toString().toLowerCase().trim();
          const targetLaneName = (acc.params.nuevaCalleNombre || acc.params.nuevaCalleName || acc.params.calleNombre || '').toString().toLowerCase().trim();
          if (!nName || !targetLaneName) break;

          let sourceNode: Actividad | null = null;
          let sourceLaneIdx = -1;
          let nodeIdx = -1;

          for (let i = 0; i < sel.calles.length; i++) {
            const idx = sel.calles[i].actividades.findIndex(a => a.nombre.toLowerCase().includes(nName));
            if (idx >= 0) {
              sourceNode = sel.calles[i].actividades[idx];
              sourceLaneIdx = i;
              nodeIdx = idx;
              break;
            }
          }

          if (sourceNode && sourceLaneIdx >= 0) {
            const targetLaneIdx = sel.calles.findIndex(c => c.nombre.toLowerCase().includes(targetLaneName));
            if (targetLaneIdx >= 0 && targetLaneIdx !== sourceLaneIdx) {
              sel.calles[sourceLaneIdx].actividades.splice(nodeIdx, 1);
              // Forzar que el nodo se reposicione automáticamente en la nueva calle
              sourceNode.posX = undefined;
              sourceNode.posY = undefined;
              sel.calles[targetLaneIdx].actividades.push(sourceNode);
              console.log(`[AiAssistant] Nodo '${sourceNode.nombre}' movido de '${sel.calles[sourceLaneIdx].nombre}' a '${sel.calles[targetLaneIdx].nombre}'`);
            } else if (targetLaneIdx === sourceLaneIdx) {
              console.warn(`[AiAssistant] El nodo ya está en la calle '${targetLaneName}'`);
            } else {
              console.error(`[AiAssistant] No se encontró la calle destino: '${targetLaneName}'`);
            }
          } else {
            console.error(`[AiAssistant] No se encontró el nodo a mover: '${nName}'`);
          }
          break;
        }
        case 'REORDENAR_CALLES': {
          const names = acc.params.nombresOrdenados as string[];
          if (!names || !Array.isArray(names)) break;
          
          const newCalles: Calle[] = [];
          for (const n of names) {
            const lane = sel.calles.find(c => c.nombre.toLowerCase().includes(n.toLowerCase()));
            if (lane) newCalles.push(lane);
          }
          // Añadir las que falten
          for (const c of sel.calles) {
            if (!newCalles.find(nc => nc.id === c.id)) newCalles.push(c);
          }
          sel.calles = newCalles;
          break;
        }
        case 'MODIFICAR_TRANSICION': {
          const oName = (acc.params.origenNombre as string || '').toLowerCase().trim();
          const dName = (acc.params.destinoNombre as string || '').toLowerCase().trim();
          if (!oName || !dName) break;

          let oNodeId = '';
          let dNodeId = '';
          for (const c of sel.calles) {
            for (const a of c.actividades) {
              if (a.nombre.toLowerCase().includes(oName)) oNodeId = a.id;
              if (a.nombre.toLowerCase().includes(dName)) dNodeId = a.id;
            }
          }

          const trans = sel.transiciones.find(t => t.origenId === oNodeId && t.destinoId === dNodeId);
          if (trans) {
            if (acc.params.etiqueta !== undefined) trans.etiqueta = acc.params.etiqueta;
            if (acc.params.condicion !== undefined) trans.condicion = acc.params.condicion;
            if (acc.params.color) trans.color = acc.params.color;
            if (acc.params.tipoLinea) trans.tipoLinea = acc.params.tipoLinea;
            if (acc.params.grosor) trans.grosor = acc.params.grosor;
          }
          break;
        }
        case 'CAMBIAR_ESTILO': {
          const targetName = (acc.params.nombre as string || '').toLowerCase().trim();
          if (!targetName) break;

          // Buscar en nodos
          for (const c of sel.calles) {
            const act = c.actividades.find(a => a.nombre.toLowerCase().includes(targetName));
            if (act) {
              if (acc.params.color) act.color = acc.params.color;
              if (acc.params.ancho) act.ancho = acc.params.ancho;
              if (acc.params.alto) act.alto = acc.params.alto;
              if (acc.params.fontSize) act.fontSize = acc.params.fontSize;
              if (acc.params.descripcion) act.descripcion = acc.params.descripcion;
              return;
            }
          }
          // Buscar en calles
          const lane = sel.calles.find(c => c.nombre.toLowerCase().includes(targetName));
          if (lane) {
            if (acc.params.color) lane.color = acc.params.color;
            if (acc.params.ancho) lane.ancho = acc.params.ancho;
          }
          break;
        }
        case 'MOVER_NODO_COORDENADAS': {
          const nName = (acc.params.nombreNodo as string || '').toLowerCase().trim();
          const x = acc.params.x;
          const y = acc.params.y;
          
          for (const c of sel.calles) {
            const act = c.actividades.find(a => a.nombre.toLowerCase().includes(nName));
            if (act) {
              if (x !== undefined) act.posX = x;
              if (y !== undefined) act.posY = y;
              break;
            }
          }
          break;
        }
        case 'ELIMINAR_TRANSICION': {
          const oName = (acc.params.origenNombre as string || '').toLowerCase().trim();
          const dName = (acc.params.destinoNombre as string || '').toLowerCase().trim();
          if (!oName || !dName) break;

          let oId = '';
          let dId = '';
          for (const c of sel.calles) {
            for (const a of c.actividades) {
              if (a.nombre.toLowerCase().includes(oName)) oId = a.id;
              if (a.nombre.toLowerCase().includes(dName)) dId = a.id;
            }
          }

          if (oId && dId) {
            sel.transiciones = sel.transiciones.filter(t => !(t.origenId === oId && t.destinoId === dId));
          }
          break;
        }
        case 'RENOMBRAR_CALLE': {
          const currentName = (acc.params.nombreActual as string || '').toLowerCase().trim();
          const newLaneName = acc.params.nuevoNombre as string || 'Calle Renombrada';
          if (!currentName) break;

          const lane = sel.calles.find(c => c.nombre.toLowerCase().includes(currentName));
          if (lane) {
            lane.nombre = newLaneName;
          }
          break;
        }
        case 'ASIGNAR_PLANTILLA': {
          const nodeName = (acc.params.nombreNodo as string || '').toLowerCase().trim();
          const tplName = (acc.params.nombrePlantilla as string || '').toLowerCase().trim();
          if (!nodeName || !tplName || !this.sel) break;

          const tpl = (this.templates() || []).find((t: any) => t.nombre.toLowerCase().includes(tplName));
          if (!tpl) break;

          for (const c of this.sel.calles) {
            const act = c.actividades.find((a: any) => a.nombre.toLowerCase().includes(nodeName));
            if (act) {
              act.plantillaId = tpl.id;
              act.esquemaFormulario = { fields: JSON.parse(JSON.stringify(tpl.campos)) };
              break;
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('Error procesando acción IA', e);
    }
  }

  getFindingForNode(nodeId: string) {
    return this.mlFindingsMap()[nodeId] || null;
  }

  getDeptos() { return this.adminSvc.departamentos(); }
}

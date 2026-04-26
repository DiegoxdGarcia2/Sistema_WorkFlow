import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';
import { AdminService, Departamento } from '../../services/admin.service';
import { FormularioService, FormularioTemplate } from '../../services/formulario.service';
import { FormBuilderComponent } from '../admin/form-builder.component';
import { signal } from '@angular/core';

interface FormField { 
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
  imports: [CommonModule, FormsModule, FormBuilderComponent],
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css'],
})
export class DesignerComponent implements OnInit, OnDestroy {
  // ── Constants ──
  readonly LW = 270;   // lane width
  readonly NW = 210;   // node width
  readonly NH = 76;    // node height
  readonly NG = 56;    // node gap
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

  // ── Lane Selection ──
  calleSeleccionada: Calle | null = null;
  calleSelIdx = -1;

  // ── Transition Selection ──
  transicionSeleccionada: Transicion | null = null;

  // ── Auto-save ──
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private autoSaveTimer: any = null;

  // ── Drag ──
  isDragging = false;
  dragNodeId = '';
  dragOffsetX = 0;
  dragOffsetY = 0;
  dragOriginCi = -1;
  dragOriginAi = -1;
  hoveredLaneIdx = -1;
  nodePositions: Record<string, { x: number; y: number }> = {};
  hoveredNodeId: string | null = null;
  
  // ── Drag Handle to Connect ──
  isCreatingConn = false;
  tempConnSource: Actividad | null = null;
  tempConnAnchor: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
  mostrarFormManager = false;

  // ── Drag Connection End ──
  isDraggingConn = false;
  dragConnId = '';
  dragConnEnd: 'origen' | 'destino' | null = null;

  // ── Lane Drag Reorder ──
  isDraggingLane = false;
  dragLaneIdx = -1;
  dragLaneOverIdx = -1;

  // ── Alignment Guides ──
  guides: { x?: number, y?: number }[] = [];

  // ── Lane Resizing ──
  isResizingLane = false;
  resizeLaneIdx = -1;
  resizeStartX = 0;
  resizeStartW = 0;

  // ── Simulation ──
  showRightPanel = true;
  isSimulating = false;
  activeSimNodes: string[] = [];
  simLog: string[] = [];

  // ── Connection Mode ──
  connMode = { active: false, tipo: 'SECUENCIAL' as TipoRuta, sourceId: null as string | null };
  mouseX = 0;
  mouseY = 0;

  // ── Form Builder ──
  formFields: FormField[] = [];

  // ── Modals ──
  mostrarModalCrear = false;
  errorCrear = '';
  nuevaPolitica = { nombre: '', descripcion: '' };
  mostrarModalAddCalle = false;
  nuevaCalleNombre = '';
  nuevaCalleDeptoId = '';
  nuevaCalleColor = '#475569';
  mostrarConfirmEliminar = false;

  // ── Toast ──
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

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
    private route: ActivatedRoute,
    private router: Router,
  ) {}

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
  ngOnDestroy(): void { if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.connMode.active) this.cancelConnMode();
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

  goBack(): void { this.router.navigate(['/designer']); }

  // ── Selection ──
  seleccionar(p: PoliticaDTO): void {
    // Re-fetch from server to get latest version
    this.politicaService.buscarPorId(p.id).subscribe({
      next: (fresh) => {
        this.sel = JSON.parse(JSON.stringify(fresh));
        this.nodoSeleccionado = null;
        this.transicionSeleccionada = null;
        this.calleSeleccionada = null;
        this.generateLayout();
      },
      error: () => {
        // Fallback to cached version
        this.sel = JSON.parse(JSON.stringify(p));
        this.nodoSeleccionado = null;
        this.transicionSeleccionada = null;
        this.calleSeleccionada = null;
        this.generateLayout();
      }
    });
  }
  contarNodos(p: PoliticaDTO): number { return p.calles.reduce((s, c) => s + c.actividades.length, 0); }

  // ── Layout Engine ──
  generateLayout(): void {
    if (!this.sel) return;
    this.nodePositions = {};
    for (let ci = 0; ci < this.sel.calles.length; ci++) {
      const laneX = this.getLaneX(ci);
      const laneW = this.sel.calles[ci].ancho || this.LW;
      
      for (let ai = 0; ai < this.sel.calles[ci].actividades.length; ai++) {
        const act = this.sel.calles[ci].actividades[ai];
        const w = act.ancho || this.NW;
        
        if (act.posX != null && act.posY != null) {
          this.nodePositions[act.id] = { x: act.posX, y: act.posY };
        } else {
          // Default layout: column centered in lane, rows based on index
          const initialX = laneX + (laneW - w) / 2;
          const initialY = this.TOP + ai * (this.NH + this.NG);
          this.nodePositions[act.id] = { x: initialX, y: initialY };
          act.posX = initialX;
          act.posY = initialY;
        }
      }
    }
  }

  getNodoPos(actId: string): { x: number; y: number } {
    return this.nodePositions[actId] || { x: 0, y: 0 };
  }
  getLaneX(ci: number): number { 
    if (!this.sel) return ci * this.LW;
    let x = 0;
    for (let i = 0; i < ci; i++) {
      x += (this.sel.calles[i].ancho || this.LW);
    }
    return x;
  }

  getCanvasW(): number { 
    if (!this.sel) return 800;
    let totalW = 0;
    for (const c of this.sel.calles) totalW += (c.ancho || this.LW);
    return Math.max(totalW + 100, 800);
  }
  getCanvasH(): number {
    if (!this.sel) return 800;
    let maxY = 0;
    // Calculate based on actual node positions
    for (const id in this.nodePositions) {
      maxY = Math.max(maxY, this.nodePositions[id].y + this.NH);
    }
    // Also consider the default vertical layout for lanes
    let maxN = 1;
    for (const c of this.sel.calles) maxN = Math.max(maxN, c.actividades.length);
    const defaultY = this.TOP + maxN * (this.NH + this.NG) + 120;
    
    return Math.max(maxY + 300, defaultY, 800); // Extra margin for adding more nodes
  }

  // ── Node Interaction ──
  seleccionarNodo(ci: number, ai: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDragging) return;

    const act = this.sel!.calles[ci].actividades[ai];

    if (this.connMode.active) {
      if (!this.connMode.sourceId) {
        this.connMode.sourceId = act.id;
      } else if (this.connMode.sourceId !== act.id) {
        this.sel!.transiciones.push({
          id: crypto.randomUUID(), origenId: this.connMode.sourceId, destinoId: act.id,
          tipoRuta: this.connMode.tipo, condicion: '', etiqueta: '', prioridad: 0,
          color: '#475569', tipoLinea: 'solida', grosor: 2,
          origenAnchor: 'bottom', destinoAnchor: 'top'
        });
        this.cancelConnMode();
        this.triggerAutoSave();
      }
      return;
    }

    this.transicionSeleccionada = null;
    this.calleSeleccionada = null;
    this.nodoSeleccionado = act;
    this.editCalleIdx = ci;
    this.editActIdx = ai;
    if (!act.ancho) act.ancho = this.NW;
    if (!act.alto) act.alto = this.NH;
    if (!act.fontSize) act.fontSize = 'md';
    this.activeTab = 'general';
    this.loadFormFields();
  }

  // ── Lane Click ──
  seleccionarCalle(ci: number, event: MouseEvent): void {
    event.stopPropagation();
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
    this.calleSeleccionada = this.sel!.calles[ci];
    this.calleSelIdx = ci;
  }

  // ── Auto-change callback (called from template via ngModelChange) ──
  onNodeChange(): void {
    if (this.nodoSeleccionado) {
      this.generateLayout();
      this.triggerAutoSave();
    }
  }
  onNodeLaneChange(newCi: number): void {
    if (newCi !== this.editCalleIdx) {
      this.moveNodeToLane(newCi);
    }
    this.triggerAutoSave();
  }
  onTransChange(): void { this.triggerAutoSave(); }
  onCalleChange(): void {
    // Force update reference so Angular detects change
    if (this.sel && this.calleSelIdx >= 0) {
      this.sel.calles = [...this.sel.calles];
    }
    this.triggerAutoSave();
  }

  onCanvasBgClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (t.closest('.node-card') || t.closest('.sidebar-left') || t.closest('.sidebar-right')) return;
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
  }

  // guardarNodoDesdePanel removed — now using direct binding + auto-save

  moveNodeToLane(targetCi: number): void {
    if (!this.sel || targetCi === this.editCalleIdx) return;
    const node = this.sel.calles[this.editCalleIdx].actividades.splice(this.editActIdx, 1)[0];
    // Clear position so it gets recalculated in the new lane
    node.posX = undefined;
    node.posY = undefined;
    this.sel.calles[targetCi].actividades.push(node);
    this.editCalleIdx = targetCi;
    this.editActIdx = this.sel.calles[targetCi].actividades.length - 1;
    this.generateLayout();
  }

  // ── Drag ──
  onNodoMouseDown(e: MouseEvent, ci: number, ai: number): void {
    if (this.connMode.active) return;
    const act = this.sel!.calles[ci].actividades[ai];
    if (!act) return;
    e.preventDefault();
    const pos = this.nodePositions[act.id];
    if (!pos) return;
    this.dragNodeId = act.id;
    this.dragOriginCi = ci;
    this.dragOriginAi = ai;
    this.dragOffsetX = e.clientX - pos.x;
    this.dragOffsetY = e.clientY - pos.y;
    this.isDragging = false;
    const sx = e.clientX, sy = e.clientY;
    const check = (me: MouseEvent) => {
      if (Math.abs(me.clientX - sx) > 4 || Math.abs(me.clientY - sy) > 4) {
        this.isDragging = true;
        document.removeEventListener('mousemove', check);
      }
    };
    document.addEventListener('mousemove', check);
  }

  onCanvasMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scroll = (e.currentTarget as HTMLElement);
    this.mouseX = e.clientX - rect.left + scroll.scrollLeft;
    this.mouseY = e.clientY - rect.top + scroll.scrollTop;

    if (this.isResizingLane && this.resizeLaneIdx !== -1 && this.sel) {
      const dx = e.clientX - this.resizeStartX;
      const newW = Math.max(200, this.resizeStartW + dx);
      const oldW = this.sel.calles[this.resizeLaneIdx].ancho || this.LW;
      const deltaStep = newW - oldW;

      this.sel.calles[this.resizeLaneIdx].ancho = newW;
      
      // Desplazar todos los nodos de las calles siguientes para que mantengan su posición visual relativa
      for (let i = this.resizeLaneIdx + 1; i < this.sel.calles.length; i++) {
        for (const act of this.sel.calles[i].actividades) {
          if (act.posX != null) act.posX += deltaStep;
        }
      }
      
      this.generateLayout();
      return;
    }

    if (this.isCreatingConn && this.tempConnSource) {
      // Temp connection line follows mouse
      return;
    }

    if (this.isDraggingConn && this.dragConnId && this.dragConnEnd) {
      this.hoveredLaneIdx = Math.floor(this.mouseX / this.LW);
      return;
    }

    if (!this.isDragging || !this.dragNodeId) return;

    const newX = this.mouseX - (this.NW / 2);
    const newY = this.mouseY - (this.NH / 2);
    const snappedX = Math.round(newX / 12) * 12;
    const snappedY = Math.round(newY / 12) * 12;

    this.nodePositions[this.dragNodeId] = { x: snappedX, y: snappedY };

    // Guides
    this.guides = [];
    const others = this.getAllActividades().filter(a => a.id !== this.dragNodeId);
    for (const other of others) {
      const oPos = this.getNodoPos(other.id);
      const ow = other.ancho || this.NW;
      if (Math.abs(snappedX + this.NW/2 - (oPos.x + ow/2)) < 6) this.guides.push({ x: oPos.x + ow/2 });
      if (Math.abs(snappedY + this.NH/2 - (oPos.y + this.NH/2)) < 6) this.guides.push({ y: oPos.y + this.NH/2 });
    }
    
    this.hoveredLaneIdx = Math.floor(this.mouseX / this.LW);
    if (this.hoveredLaneIdx < 0) this.hoveredLaneIdx = 0;
    if (this.sel && this.hoveredLaneIdx >= this.sel.calles.length) this.hoveredLaneIdx = this.sel.calles.length - 1;
  }

  onCanvasMouseUp(): void {
    if (this.isResizingLane) {
      this.isResizingLane = false;
      this.triggerAutoSave();
      return;
    }

    if (this.isCreatingConn && this.sel && this.tempConnSource) {
      if (this.hoveredNodeId && this.hoveredNodeId !== this.tempConnSource.id) {
        // Create connection
        const newTrans: Transicion = {
          id: crypto.randomUUID(), origenId: this.tempConnSource.id, destinoId: this.hoveredNodeId,
          tipoRuta: 'SECUENCIAL', condicion: '', etiqueta: '', prioridad: 0,
          color: '#475569', tipoLinea: 'solida', grosor: 2,
          origenAnchor: this.tempConnAnchor,
          destinoAnchor: this.calculateBestAnchor(this.tempConnSource.id, this.hoveredNodeId, true)
        };
        this.sel.transiciones.push(newTrans);
        this.triggerAutoSave();
        this.showToast('Conexión creada', 'success');
      }
      this.isCreatingConn = false;
      this.tempConnSource = null;
      return;
    }

    if (this.isDraggingConn && this.sel && this.dragConnId && this.dragConnEnd) {
      // Find node under mouse
      let foundNodeId = '';
      for (const c of this.sel.calles) {
        for (const a of c.actividades) {
          const pos = this.getNodoPos(a.id);
          const w = a.ancho || this.NW;
          const h = a.alto || this.NH;
          if (this.mouseX >= pos.x && this.mouseX <= pos.x + w && this.mouseY >= pos.y && this.mouseY <= pos.y + h) {
            foundNodeId = a.id; break;
          }
        }
        if (foundNodeId) break;
      }

      if (foundNodeId) {
        const t = this.sel.transiciones.find(tx => tx.id === this.dragConnId);
        if (t) {
          const pos = this.getNodoPos(foundNodeId);
          const a = this.getAllActividades().find(act => act.id === foundNodeId);
          const w = a?.ancho || this.NW;
          const h = a?.alto || this.NH;
          
          // Detect closest anchor
          const distTop = Math.hypot(this.mouseX - (pos.x + w/2), this.mouseY - pos.y);
          const distBot = Math.hypot(this.mouseX - (pos.x + w/2), this.mouseY - (pos.y + h));
          const distL   = Math.hypot(this.mouseX - pos.x, this.mouseY - (pos.y + h/2));
          const distR   = Math.hypot(this.mouseX - (pos.x + w), this.mouseY - (pos.y + h/2));
          
          const min = Math.min(distTop, distBot, distL, distR);
          let anchor: 'top' | 'bottom' | 'left' | 'right' = 'top';
          if (min === distTop) anchor = 'top';
          else if (min === distBot) anchor = 'bottom';
          else if (min === distL)   anchor = 'left';
          else if (min === distR)   anchor = 'right';

          if (this.dragConnEnd === 'origen') {
            t.origenId = foundNodeId;
            t.origenAnchor = anchor;
          } else {
            t.destinoId = foundNodeId;
            t.destinoAnchor = anchor;
          }
          this.triggerAutoSave();
        }
      }
      this.isDraggingConn = false;
      this.dragConnId = '';
      this.dragConnEnd = null;
      return;
    }

    if (this.isDragging && this.sel && this.dragNodeId) {
      const targetLane = this.hoveredLaneIdx;
      if (targetLane >= 0 && targetLane !== this.dragOriginCi) {
        const node = this.sel.calles[this.dragOriginCi].actividades.splice(this.dragOriginAi, 1)[0];
        // Move to new lane
        this.sel.calles[targetLane].actividades.push(node);
      }
      this.persistPositions();
      this.generateLayout();
      this.triggerAutoSave();
      setTimeout(() => this.isDragging = false, 50);
    }
    this.guides = [];
    this.dragNodeId = '';
    this.hoveredLaneIdx = -1;
    this.dragOriginCi = -1;
  }

  onLaneResizeMouseDown(e: MouseEvent, ci: number): void {
    e.stopPropagation(); e.preventDefault();
    this.isResizingLane = true;
    this.resizeLaneIdx = ci;
    this.resizeStartX = e.clientX;
    this.resizeStartW = this.sel?.calles[ci].ancho || this.LW;
  }

  onHandleMouseDown(e: MouseEvent, act: Actividad, anchor: 'top' | 'bottom' | 'left' | 'right'): void {
    e.stopPropagation(); e.preventDefault();
    this.isCreatingConn = true;
    this.tempConnSource = act;
    this.tempConnAnchor = anchor;
  }

  onConnHandleMouseDown(e: MouseEvent, transId: string, end: 'origen' | 'destino'): void {
    e.stopPropagation(); e.preventDefault();
    this.isDraggingConn = true;
    this.dragConnId = transId;
    this.dragConnEnd = end;
  }

  setAnchor(trans: Transicion, end: 'origen' | 'destino', anchor: 'top' | 'bottom' | 'left' | 'right'): void {
    if (end === 'origen') trans.origenAnchor = anchor;
    else trans.destinoAnchor = anchor;
    this.triggerAutoSave();
  }

  private persistPositions(): void {
    if (!this.sel) return;
    this.sel.calles.forEach((calle, ci) => {
      const laneX = this.getLaneX(ci);
      const laneW = calle.ancho || this.LW;
      const minX = laneX + 20; // Margen interno
      const maxX = laneX + laneW - 20;

      for (const act of calle.actividades) {
        const pos = this.nodePositions[act.id];
        if (pos) {
          const w = act.ancho || this.NW;
          // Ajustar posX para que no quede entre dos calles
          let x = pos.x;
          if (x < minX) x = minX;
          if (x + w > maxX) x = maxX - w;
          
          act.posX = x;
          act.posY = pos.y;
          // Actualizar el tracker visual para que no haya salto al soltar
          this.nodePositions[act.id] = { x, y: pos.y };
        }
      }
    });
  }

  // ── Connection Mode ──
  startConnMode(tipo: TipoRuta): void {
    this.connMode = { active: true, tipo, sourceId: null };
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
  }
  cancelConnMode(): void { this.connMode = { active: false, tipo: 'SECUENCIAL', sourceId: null }; }

  getSourceCenter(): { x: number; y: number } | null {
    if (this.isCreatingConn && this.tempConnSource) {
      return this.findNodeAnchor(this.tempConnSource.id, this.tempConnAnchor, false);
    }
    if (!this.connMode.sourceId || !this.sel) return null;
    return this.findNodeAnchor(this.connMode.sourceId, 'bottom', false);
  }

  // ── SVG Connections ──
  getConnectionPaths(): any[] {
    if (!this.sel) return [];
    return this.sel.transiciones.map(t => {
      // Calculate best anchors if they are 'auto' or undefined
      const fromAnchor = t.origenAnchor || this.calculateBestAnchor(t.origenId, t.destinoId, false);
      const toAnchor = t.destinoAnchor || this.calculateBestAnchor(t.origenId, t.destinoId, true);

      const from = this.findNodeAnchor(t.origenId, fromAnchor, false);
      const to = this.findNodeAnchor(t.destinoId, toAnchor, true);
      if (!from || !to) return null;

      const x1 = from.x, y1 = from.y;
      const x2 = to.x, y2 = to.y;

      // Handle dragging visually
      const dx1 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'origen') ? this.mouseX : x1;
      const dy1 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'origen') ? this.mouseY : y1;
      const dx2 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'destino') ? this.mouseX : x2;
      const dy2 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'destino') ? this.mouseY : y2;

      const midY = (dy1 + dy2) / 2;
      const midX = (dx1 + dx2) / 2;
      
      let path: string;
      const anchor1 = fromAnchor;
      const anchor2 = toAnchor;

      if (anchor1 === 'bottom' && anchor2 === 'top' && dy2 > dy1) {
        path = `M ${dx1} ${dy1} C ${dx1} ${midY}, ${dx2} ${midY}, ${dx2} ${dy2}`;
      } else if (anchor1 === 'right' && anchor2 === 'left' && dx2 > dx1) {
        path = `M ${dx1} ${dy1} C ${midX} ${dy1}, ${midX} ${dy2}, ${dx2} ${dy2}`;
      } else if (anchor1 === 'top' && anchor2 === 'bottom' && dy1 > dy2) {
         path = `M ${dx1} ${dy1} C ${dx1} ${midY}, ${dx2} ${midY}, ${dx2} ${dy2}`;
      } else {
        const offset = Math.min(Math.abs(dx1 - dx2), Math.abs(dy1 - dy2), 50);
        path = `M ${dx1} ${dy1} C ${anchor1==='right'?dx1+offset:anchor1==='left'?dx1-offset:dx1} ${anchor1==='bottom'?dy1+offset:anchor1==='top'?dy1-offset:dy1},
                                 ${anchor2==='right'?dx2+offset:anchor2==='left'?dx2-offset:dx2} ${anchor2==='bottom'?dy2+offset:anchor2==='top'?dy2-offset:dy2},
                                 ${dx2} ${dy2}`;
      }

      const dash = t.tipoLinea === 'punteada' ? '4 4' : t.tipoLinea === 'discontinua' ? '10 5' : '';
      return {
        id: t.id, path, origenId: t.origenId, destinoId: t.destinoId,
        x1: dx1, y1: dy1, x2: dx2, y2: dy2,
        label: t.etiqueta || '', labelX: midX, labelY: midY - 8,
        color: t.color || '#475569', dash, width: t.grosor || 2, trans: t,
      };
    }).filter(Boolean);
  }

  private calculateBestAnchor(sourceId: string, targetId: string, isDest: boolean): 'top' | 'bottom' | 'left' | 'right' {
    const sPos = this.getNodoPos(sourceId);
    const tPos = this.getNodoPos(targetId);
    if (!sPos || !tPos) return isDest ? 'top' : 'bottom';

    const dx = tPos.x - sPos.x;
    const dy = tPos.y - sPos.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal preference
      if (isDest) return dx > 0 ? 'left' : 'right';
      return dx > 0 ? 'right' : 'left';
    } else {
      // Vertical preference
      if (isDest) return dy > 0 ? 'top' : 'bottom';
      return dy > 0 ? 'bottom' : 'top';
    }
  }

  findNodeAnchor(actId: string, anchor?: 'top' | 'bottom' | 'left' | 'right', isDest = false): { x: number; y: number } | null {
    if (!this.sel) return null;
    for (const c of this.sel.calles) {
      const a = c.actividades.find(act => act.id === actId);
      if (a) {
        const pos = this.getNodoPos(actId);
        const w = a.ancho || this.NW;
        const h = a.alto || this.NH;
        const type = anchor || (isDest ? 'top' : 'bottom');
        
        // Small padding to ensure arrow touches boundary but doesn't overlap border too much
        const pad = 2;
        switch(type) {
          case 'top':    return { x: pos.x + w/2, y: pos.y - pad };
          case 'bottom': return { x: pos.x + w/2, y: pos.y + h + pad };
          case 'left':   return { x: pos.x - pad, y: pos.y + h/2 };
          case 'right':  return { x: pos.x + w + pad, y: pos.y + h/2 };
        }
      }
    }
    return null;
  }

  selectTransicion(t: Transicion): void {
    this.nodoSeleccionado = null;
    this.calleSeleccionada = null;
    this.transicionSeleccionada = t;
    if (!t.color) t.color = '#475569';
    if (!t.tipoLinea) t.tipoLinea = 'solida';
    if (!t.grosor) t.grosor = 2;
  }

  getNodeConnections(actId: string): { id: string; fromName: string; toName: string; tipoRuta: string }[] {
    if (!this.sel) return [];
    return this.sel.transiciones.filter(t => t.origenId === actId || t.destinoId === actId)
      .map(t => ({ id: t.id, fromName: this.getNombreActividad(t.origenId), toName: this.getNombreActividad(t.destinoId), tipoRuta: t.tipoRuta }));
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
    this.saveStatus = 'saving';
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
        this.saveStatus = 'saved';
        setTimeout(() => { if (this.saveStatus === 'saved') this.saveStatus = 'idle'; }, 2000);
      },
      error: (e: any) => { this.saveStatus = 'error'; this.showToast(e.error?.message || 'Error al guardar', 'error'); },
    });
  }

  triggerAutoSave(): void {
    if (!this.sel || this.sel.estaActiva) return;
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.saveStatus = 'saving';
    this.autoSaveTimer = setTimeout(() => this.guardarPolitica(), 800);
  }

  // ── Lane Reorder ──
  onLaneHeaderDragStart(ci: number): void {
    this.isDraggingLane = true;
    this.dragLaneIdx = ci;
  }
  onLaneHeaderDragOver(ci: number, e: DragEvent): void {
    e.preventDefault();
    this.dragLaneOverIdx = ci;
  }
  onLaneHeaderDrop(ci: number): void {
    if (!this.sel || this.dragLaneIdx < 0 || this.dragLaneIdx === ci) {
      this.isDraggingLane = false;
      this.dragLaneIdx = -1;
      this.dragLaneOverIdx = -1;
      return;
    }

    const oldIdx = this.dragLaneIdx;
    const newIdx = ci;
    if (oldIdx === newIdx) {
      this.isDraggingLane = false;
      this.dragLaneIdx = -1;
      this.dragLaneOverIdx = -1;
      return;
    }
    
    // 1. Mapear posiciones X actuales por ID de calle antes de mover
    const oldLaneXMap: Record<string, number> = {};
    this.sel.calles.forEach((c, i) => {
      oldLaneXMap[c.id] = this.getLaneX(i);
    });

    // 2. Reordenar el array
    const laneToMove = this.sel.calles.splice(oldIdx, 1)[0];
    this.sel.calles.splice(newIdx, 0, laneToMove);

    // 3. Aplicar el desplazamiento a los nodos
    this.sel.calles.forEach((c, i) => {
      c.orden = i;
      const oldX = oldLaneXMap[c.id];
      const newX = this.getLaneX(i);
      const delta = newX - oldX;

      if (delta !== 0) {
        for (const act of c.actividades) {
          if (act.posX != null) {
            act.posX += delta;
            // IMPORTANTE: También actualizar nodePositions para que generateLayout no lo sobrescriba
            if (this.nodePositions[act.id]) {
              this.nodePositions[act.id].x += delta;
            }
          }
        }
      }
    });

    this.triggerAutoSave();
    this.isDraggingLane = false;
    this.dragLaneIdx = -1;
    this.dragLaneOverIdx = -1;
    // No llamamos a generateLayout() aquí para evitar recalcular lo que ya movimos manualmente
  }
  onLaneHeaderDragEnd(): void {
    this.isDraggingLane = false;
    this.dragLaneIdx = -1;
    this.dragLaneOverIdx = -1;
  }

  // ── Crear nueva versión de política LIVE ──
  crearNuevaVersion(): void {
    if (!this.sel) return;
    const tid = this.auth.usuario()?.tenantId;
    if (!tid) return;
    const body: any = {
      tenantId: tid,
      nombre: this.sel.nombre,
      descripcion: this.sel.descripcion,
      version: this.sel.version + 1,
      calles: JSON.parse(JSON.stringify(this.sel.calles)),
      transiciones: JSON.parse(JSON.stringify(this.sel.transiciones)),
    };
    if (this.sel.proyectoId) body.proyectoId = this.sel.proyectoId;
    this.politicaService.crear(body).subscribe({
      next: (created: PoliticaDTO) => {
        this.cargarPoliticas();
        this.seleccionar(created);
        this.showToast(`Versión ${body.version} creada (borrador)`, 'success');
      },
      error: (e: any) => this.showToast(e.error?.message || 'Error al crear versión', 'error'),
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
    this.politicaService.eliminar(this.sel.id).subscribe({
      next: () => { this.sel = null; this.nodoSeleccionado = null; this.mostrarConfirmEliminar = false; this.cargarPoliticas(); this.showToast('Política eliminada', 'success'); },
      error: (e: any) => { this.mostrarConfirmEliminar = false; this.showToast(e.error?.message || 'Error al eliminar', 'error'); },
    });
  }

  // ── CRUD: Calles ──
  agregarCalle(): void {
    if (!this.sel) return;
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
    const removedIds = this.sel.calles[ci].actividades.map(a => a.id);
    this.sel.transiciones = this.sel.transiciones.filter(t => !removedIds.includes(t.origenId) && !removedIds.includes(t.destinoId));
    this.sel.calles.splice(ci, 1);
    this.nodoSeleccionado = null;
    if (this.calleSeleccionada && this.calleSelIdx === ci) this.calleSeleccionada = null;
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast('Calle eliminada', 'success');
  }

  // ── CRUD: Nodos ──
  agregarNodo(tipo: TipoActividad): void {
    if (!this.sel || this.sel.estaActiva) return;
    if (this.sel.calles.length === 0) { this.showToast('Crea una calle primero', 'error'); return; }
    const ci = this.calleSelIdx >= 0 ? this.calleSelIdx : 0;
    const names: Record<string, string> = { INICIO: 'Inicio', TAREA: 'Nueva Tarea', DECISION: 'Decisión', FORK: 'Fork', JOIN: 'Join', FIN: 'Fin', MERGE: 'Merge' };
    const newAct: Actividad = { id: crypto.randomUUID(), nombre: names[tipo] || 'Nodo', tipo, esInicial: tipo === 'INICIO', esFinal: tipo === 'FIN', orden: this.sel.calles[ci].actividades.length, ancho: this.NW, alto: this.NH, fontSize: 'md' };
    this.sel.calles[ci].actividades.push(newAct);
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast(`Nodo ${tipo} añadido`, 'success');
  }
  eliminarNodoSeleccionado(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
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

  showToast(msg: string, type: 'success' | 'error'): void {
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

  onNodeMouseEnter(id: string): void { this.hoveredNodeId = id; }
  onNodeMouseLeave(): void { this.hoveredNodeId = null; }

  // ── Simulation Logic ──
  startSimulation(): void {
    if (!this.sel) return;
    this.isSimulating = true;
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
    this.calleSeleccionada = null;
    this.activeSimNodes = [];
    this.simLog = ['Simulación lista. Haz clic en Inicio.'];
    
    const inicio = this.getAllActividades().find(a => a.tipo === 'INICIO');
    if (inicio) {
      this.activeSimNodes = [inicio.id];
    }
  }

  stopSimulation(): void {
    this.isSimulating = false;
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

  getDeptos() { return this.adminSvc.departamentos(); }
}

import { Component, input, model, output, inject, OnInit, OnDestroy, ChangeDetectorRef, effect, untracked, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../../models/bpm.models';
import { AuthService } from '../../../services/auth.service';
import { ColaboracionService } from '../../../services/colaboracion.service';
import { AnalysisResult } from '../../../services/ml-analysis.service';

@Component({
  selector: 'app-designer-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './designer-canvas.component.html',
  encapsulation: ViewEncapsulation.None
})
export class DesignerCanvasComponent implements OnInit, OnDestroy {
  // ── Signals/Inputs/Models ──
  sel = model<PoliticaDTO | null>(null);
  nodoSeleccionado = model<Actividad | null>(null);
  calleSeleccionada = model<Calle | null>(null);
  transicionSeleccionada = model<Transicion | null>(null);
  
  nodosBloqueados = input<Record<string, { userId: string, color: string, nombre: string }>>({});
  activeSimNodes = input<string[]>([]);
  isSimulating = input<boolean>(false);
  mlFindingsMap = input<Record<string, AnalysisResult['findings'][0]>>({});
  
  connMode = model<{ active: boolean; tipo: TipoRuta; sourceId: string | null }>({
    active: false,
    tipo: 'SECUENCIAL',
    sourceId: null
  });

  // ── Outputs ──
  onSave = output<void>();
  onBroadcast = output<void>();
  onShowToast = output<{ msg: string; type: 'success' | 'error' | 'info' }>();
  onAvanzarSimulacion = output<string>();
  onDeleteCalle = output<number>();

  // ── Constants ──
  readonly LW = 270;   // lane width
  readonly NW = 210;   // node width
  readonly NH = 60;    // node height
  readonly NG = 80;    // node gap
  readonly TOP = 100;  // top offset

  // ── Drag & Drop / Resize State ──
  isDragging = false;
  dragNodeId = '';
  dragOffsetX = 0;
  dragOffsetY = 0;
  dragOriginCi = -1;
  dragOriginAi = -1;
  hoveredLaneIdx = -1;
  nodePositions: Record<string, { x: number; y: number }> = {};
  hoveredNodeId: string | null = null;
  
  isCreatingConn = false;
  tempConnSource: Actividad | null = null;
  tempConnAnchor: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  isDraggingConn = false;
  dragConnId = '';
  dragConnEnd: 'origen' | 'destino' | null = null;

  isDraggingLane = false;
  dragLaneIdx = -1;
  dragLaneOverIdx = -1;

  guides: { x?: number, y?: number }[] = [];

  isResizingLane = false;
  resizeLaneIdx = -1;
  resizeStartX = 0;
  resizeStartW = 0;

  mouseX = 0;
  mouseY = 0;

  // ── Palettes ──
  laneColors = ['#475569','#6366f1','#8b5cf6','#06b6d4','#22c55e','#f97316','#e11d48','#3b82f6'];
  connColors = ['#475569','#6366f1','#818cf8','#22c55e','#f97316','#ef4444','#8b5cf6','#06b6d4'];

  // ── Internal Maps for Performance ──
  private nodeToLaneMap = new Map<string, number>(); // ActId -> LaneIndex
  private actividadesMap = new Map<string, Actividad>(); // ActId -> Actividad
  private cachedConnPaths: any[] = [];
  private highFreqSub!: Subscription;
  private lastSyncTime = 0;

  // ── Services ──
  auth = inject(AuthService);
  colabSvc = inject(ColaboracionService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Escuchar movimientos de alta frecuencia fuera de NgZone
    this.highFreqSub = this.colabSvc.highFreqUpdates$.pipe(
      throttleTime(32)
    ).subscribe((msg: any) => {
      if (msg.type === 'NODE_MOVED' && msg.payload) {
        const data = msg.payload as { id: string; x: number; y: number };
        if (this.nodePositions[data.id]) {
          this.nodePositions[data.id] = { x: data.x, y: data.y };
          this.actualizarCaminosConexion(data.id);
          this.cdr.detectChanges();
        }
      }
    });

    // Reaccionar a los cambios de la politica para recalcular el layout
    effect(() => {
      const p = this.sel();
      if (p) {
        untracked(() => {
          this.generateLayout();
        });
      }
    });
  }

  ngOnInit(): void {
    this.generateLayout();
  }

  ngOnDestroy(): void {
    if (this.highFreqSub) {
      this.highFreqSub.unsubscribe();
    }
  }

  // ── Layout Engine ──
  generateLayout(): void {
    const p = this.sel();
    if (!p) return;
    this.nodePositions = {};
    this.nodeToLaneMap.clear();
    this.actividadesMap.clear();

    for (let ci = 0; ci < p.calles.length; ci++) {
      const laneX = this.getLaneX(ci);
      const laneW = p.calles[ci].ancho || this.LW;
      
      for (let ai = 0; ai < p.calles[ci].actividades.length; ai++) {
        const act = p.calles[ci].actividades[ai];
        const w = act.ancho || this.NW;
        
        this.nodeToLaneMap.set(act.id, ci);
        this.actividadesMap.set(act.id, act);

        if (act.posX != null && act.posY != null) {
          this.nodePositions[act.id] = { x: act.posX, y: act.posY };
        } else {
          const initialX = laneX + (laneW - w) / 2;
          const initialY = this.TOP + ai * (this.NH + this.NG);
          this.nodePositions[act.id] = { x: initialX, y: initialY };
          act.posX = initialX;
          act.posY = initialY;
        }
      }
    }
    this.actualizarCaminosConexion();
  }

  getNodoPos(actId: string): { x: number; y: number } {
    return this.nodePositions[actId] || { x: 0, y: 0 };
  }

  getLaneX(ci: number): number { 
    const p = this.sel();
    if (!p) return ci * this.LW;
    let x = 0;
    for (let i = 0; i < ci; i++) {
      x += (p.calles[i].ancho || this.LW);
    }
    return x;
  }

  getCanvasW(): number { 
    const p = this.sel();
    if (!p) return 800;
    let totalW = 0;
    for (const c of p.calles) totalW += (c.ancho || this.LW);
    return Math.max(totalW + 100, 800);
  }

  getCanvasH(): number {
    const p = this.sel();
    if (!p) return 800;
    let maxY = 0;
    for (const id in this.nodePositions) {
      maxY = Math.max(maxY, this.nodePositions[id].y + this.NH);
    }
    let maxN = 1;
    for (const c of p.calles) maxN = Math.max(maxN, c.actividades.length);
    const defaultY = this.TOP + maxN * (this.NH + this.NG) + 120;
    
    return Math.max(maxY + 300, defaultY, 800);
  }

  contarNodos(p: PoliticaDTO | null): number {
    if (!p) return 0;
    return p.calles.reduce((s, c) => s + c.actividades.length, 0);
  }

  // ── Click Handlers ──
  seleccionarNodo(ci: number, ai: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isDragging) return;

    const p = this.sel();
    if (!p) return;

    const act = p.calles[ci].actividades[ai];

    if (this.nodosBloqueados()[act.id]) {
      this.onShowToast.emit({ msg: 'Nodo bloqueado por ' + this.nodosBloqueados()[act.id].nombre, type: 'error' });
      return;
    }

    const mode = this.connMode();
    if (mode.active) {
      if (!mode.sourceId) {
        this.connMode.set({ ...mode, sourceId: act.id });
      } else if (mode.sourceId !== act.id) {
        this.onSave.emit(); // trigger undo history
        p.transiciones.push({
          id: crypto.randomUUID(), origenId: mode.sourceId, destinoId: act.id,
          tipoRuta: mode.tipo, condicion: '', etiqueta: '', prioridad: 0,
          color: '#475569', tipoLinea: 'solida', grosor: 2,
          origenAnchor: 'auto', destinoAnchor: 'auto',
          enrutamiento: 'ortogonal'
        });
        this.sel.set({ ...p });
        this.connMode.set({ active: false, tipo: 'SECUENCIAL', sourceId: null });
        this.onBroadcast.emit();
        this.onSave.emit();
      }
      return;
    }

    this.transicionSeleccionada.set(null);
    this.calleSeleccionada.set(null);
    this.nodoSeleccionado.set(act);
    this.colabSvc.notificarEdicionNodo(act.id);
  }

  seleccionarCalle(ci: number, event: MouseEvent): void {
    event.stopPropagation();
    const p = this.sel();
    if (!p) return;
    this.nodoSeleccionado.set(null);
    this.colabSvc.notificarEdicionNodo(null);
    this.transicionSeleccionada.set(null);
    this.calleSeleccionada.set(p.calles[ci]);
  }

  onCanvasBgClick(event: MouseEvent): void {
    const t = event.target as HTMLElement;
    if (t.closest('.node-card') || t.closest('.sidebar-left') || t.closest('.sidebar-right')) return;
    this.nodoSeleccionado.set(null);
    this.colabSvc.notificarEdicionNodo(null);
    this.transicionSeleccionada.set(null);
  }

  // ── Drag & Drop Handlers ──
  onNodoMouseDown(e: MouseEvent, ci: number, ai: number): void {
    const mode = this.connMode();
    if (mode.active) return;
    const p = this.sel();
    if (!p) return;
    const act = p.calles[ci].actividades[ai];
    if (!act) return;
    
    if (this.nodosBloqueados()[act.id]) {
      this.onShowToast.emit({ msg: 'Nodo bloqueado por ' + this.nodosBloqueados()[act.id].nombre, type: 'error' });
      return;
    }
    
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
        this.colabSvc.notificarEdicionNodo(act.id);
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

    const p = this.sel();
    if (!p) return;

    if (this.isResizingLane && this.resizeLaneIdx !== -1) {
      const dx = e.clientX - this.resizeStartX;
      const newW = Math.max(200, this.resizeStartW + dx);
      const oldW = p.calles[this.resizeLaneIdx].ancho || this.LW;
      const deltaStep = newW - oldW;

      p.calles[this.resizeLaneIdx].ancho = newW;
      
      for (let i = this.resizeLaneIdx + 1; i < p.calles.length; i++) {
        for (const act of p.calles[i].actividades) {
          if (act.posX != null) act.posX += deltaStep;
        }
      }
      
      this.sel.set({ ...p });
      this.generateLayout();
      return;
    }

    if (this.isCreatingConn && this.tempConnSource) {
      return;
    }

    if (this.isDraggingConn && this.dragConnId && this.dragConnEnd) {
      this.hoveredLaneIdx = Math.floor(this.mouseX / this.LW);
      this.actualizarCaminosConexion();
      this.cdr.detectChanges();
      return;
    }

    if (!this.isDragging || !this.dragNodeId) return;

    const newX = this.mouseX - (this.NW / 2);
    const newY = this.mouseY - (this.NH / 2);
    const snappedX = Math.round(newX / 12) * 12;
    const snappedY = Math.round(newY / 12) * 12;

    this.nodePositions[this.dragNodeId] = { x: snappedX, y: snappedY };
    this.actualizarCaminosConexion();
    this.cdr.detectChanges();

    const now = Date.now();
    if (now - this.lastSyncTime > 16) {
      this.colabSvc.notificarMovimientoNodo(this.dragNodeId, snappedX, snappedY);
      this.lastSyncTime = now;
    }

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
    if (this.hoveredLaneIdx >= p.calles.length) this.hoveredLaneIdx = p.calles.length - 1;
  }

  onCanvasMouseUp(): void {
    const p = this.sel();
    if (!p) return;

    if (this.isResizingLane) {
      this.isResizingLane = false;
      this.onBroadcast.emit();
      this.onSave.emit();
      return;
    }

    if (this.isCreatingConn && this.tempConnSource) {
      if (this.hoveredNodeId && this.hoveredNodeId !== this.tempConnSource.id) {
        const newTrans: Transicion = {
          id: crypto.randomUUID(), origenId: this.tempConnSource.id, destinoId: this.hoveredNodeId,
          tipoRuta: 'SECUENCIAL', condicion: '', etiqueta: '', prioridad: 0,
          color: '#475569', tipoLinea: 'solida', grosor: 2,
          origenAnchor: 'auto',
          destinoAnchor: 'auto',
          enrutamiento: 'bezier'
        };
        p.transiciones.push(newTrans);
        this.sel.set({ ...p });
        this.onBroadcast.emit();
        this.onSave.emit();
        this.onShowToast.emit({ msg: 'Conexión creada', type: 'success' });
      }
      this.isCreatingConn = false;
      this.tempConnSource = null;
      return;
    }

    if (this.isDraggingConn && this.dragConnId && this.dragConnEnd) {
      let foundNodeId = '';
      for (const c of p.calles) {
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
        const t = p.transiciones.find(tx => tx.id === this.dragConnId);
        if (t) {
          if (this.dragConnEnd === 'origen') {
            t.origenId = foundNodeId;
            t.origenAnchor = 'auto';
          } else {
            t.destinoId = foundNodeId;
            t.destinoAnchor = 'auto';
          }
          this.sel.set({ ...p });
          this.onBroadcast.emit();
          this.onSave.emit();
        }
      }
      this.isDraggingConn = false;
      this.dragConnId = '';
      this.dragConnEnd = null;
      return;
    }

    if (this.isDragging && this.dragNodeId) {
      const targetLane = this.hoveredLaneIdx;
      if (targetLane >= 0 && targetLane !== this.dragOriginCi) {
        const node = p.calles[this.dragOriginCi].actividades.splice(this.dragOriginAi, 1)[0];
        p.calles[targetLane].actividades.push(node);
      }
      this.persistPositions();
      this.sel.set({ ...p });
      this.generateLayout();
      this.onBroadcast.emit();
      this.onSave.emit();
      setTimeout(() => this.isDragging = false, 50);
    }
    this.guides = [];
    this.dragNodeId = '';
    this.hoveredLaneIdx = -1;
    this.dragOriginCi = -1;
  }

  persistPositions(): void {
    const p = this.sel();
    if (!p) return;
    p.calles.forEach((calle, ci) => {
      const laneX = this.getLaneX(ci);
      const laneW = calle.ancho || this.LW;
      const minX = laneX + 20;
      const maxX = laneX + laneW - 20;

      for (const act of calle.actividades) {
        const pos = this.nodePositions[act.id];
        if (pos) {
          const w = act.ancho || this.NW;
          let x = pos.x;
          if (x < minX) x = minX;
          if (x + w > maxX) x = maxX - w;
          
          act.posX = x;
          act.posY = pos.y;
          this.nodePositions[act.id] = { x, y: pos.y };
        }
      }
    });
  }

  onLaneResizeMouseDown(e: MouseEvent, ci: number): void {
    e.stopPropagation(); e.preventDefault();
    const p = this.sel();
    if (!p) return;
    this.isResizingLane = true;
    this.resizeLaneIdx = ci;
    this.resizeStartX = e.clientX;
    this.resizeStartW = p.calles[ci].ancho || this.LW;
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

  onLaneHeaderDragStart(ci: number): void {
    this.isDraggingLane = true;
    this.dragLaneIdx = ci;
  }

  onLaneHeaderDragOver(ci: number, e: DragEvent): void {
    e.preventDefault();
    this.dragLaneOverIdx = ci;
  }

  onLaneHeaderDrop(ci: number): void {
    const p = this.sel();
    if (!p || this.dragLaneIdx < 0 || this.dragLaneIdx === ci) {
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
    
    this.onSave.emit(); // trigger undo history

    const oldLaneXMap: Record<string, number> = {};
    p.calles.forEach((c, i) => {
      oldLaneXMap[c.id] = this.getLaneX(i);
    });

    const laneToMove = p.calles.splice(oldIdx, 1)[0];
    p.calles.splice(newIdx, 0, laneToMove);

    p.calles.forEach((c, i) => {
      c.orden = i;
      const oldX = oldLaneXMap[c.id];
      const newX = this.getLaneX(i);
      const delta = newX - oldX;

      if (delta !== 0) {
        for (const act of c.actividades) {
          if (act.posX != null) {
            act.posX += delta;
            if (this.nodePositions[act.id]) {
              this.nodePositions[act.id].x += delta;
            }
          }
        }
      }
    });

    this.sel.set({ ...p });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.isDraggingLane = false;
    this.dragLaneIdx = -1;
    this.dragLaneOverIdx = -1;
  }

  onLaneHeaderDragEnd(): void {
    this.isDraggingLane = false;
    this.dragLaneIdx = -1;
    this.dragLaneOverIdx = -1;
  }

  // ── Connection Paths Calculation ──
  getConnectionPaths(): any[] {
    return this.cachedConnPaths;
  }

  actualizarCaminosConexion(movedNodeId?: string): void {
    const p = this.sel();
    if (!p) {
      this.cachedConnPaths = [];
      return;
    }

    if (movedNodeId) {
      this.cachedConnPaths = this.cachedConnPaths.map(conn => {
        if (conn.origenId === movedNodeId || conn.destinoId === movedNodeId) {
          return this.calcularRutaParaTransicion(conn.trans);
        }
        return conn;
      }).filter(Boolean);
      return;
    }

    this.cachedConnPaths = p.transiciones.map(t => this.calcularRutaParaTransicion(t)).filter(Boolean);
  }

  private calcularRutaParaTransicion(t: Transicion): any {
    const isSourceDragging = this.isDragging && this.dragNodeId === t.origenId;
    const isTargetDragging = this.isDragging && this.dragNodeId === t.destinoId;

    const fromAnchor = (!t.origenAnchor || t.origenAnchor === 'auto' || isSourceDragging || isTargetDragging) 
                       ? this.calculateBestAnchor(t.origenId, t.destinoId, false) 
                       : t.origenAnchor;
    const toAnchor = (!t.destinoAnchor || t.destinoAnchor === 'auto' || isSourceDragging || isTargetDragging) 
                     ? this.calculateBestAnchor(t.origenId, t.destinoId, true) 
                     : t.destinoAnchor;

    const from = this.findNodeAnchor(t.origenId, fromAnchor, false);
    const to = this.findNodeAnchor(t.destinoId, toAnchor, true);
    if (!from || !to) return null;

    const x1 = from.x, y1 = from.y;
    const x2 = to.x, y2 = to.y;

    const dx1 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'origen') ? this.mouseX : x1;
    const dy1 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'origen') ? this.mouseY : y1;
    const dx2 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'destino') ? this.mouseX : x2;
    const dy2 = (this.isDraggingConn && this.dragConnId === t.id && this.dragConnEnd === 'destino') ? this.mouseY : y2;

    const midY = (dy1 + dy2) / 2;
    const midX = (dx1 + dx2) / 2;
    
    let path: string;
    const anchor1 = fromAnchor;
    const anchor2 = toAnchor;
    const isOrthogonal = t.enrutamiento === 'ortogonal';

    if (isOrthogonal) {
      if (anchor1 === 'bottom' && anchor2 === 'top' && dy2 > dy1) {
        path = `M ${dx1} ${dy1} L ${dx1} ${midY} L ${dx2} ${midY} L ${dx2} ${dy2}`;
      } else if (anchor1 === 'right' && anchor2 === 'left' && dx2 > dx1) {
        path = `M ${dx1} ${dy1} L ${midX} ${dy1} L ${midX} ${dy2} L ${dx2} ${dy2}`;
      } else if (anchor1 === 'top' && anchor2 === 'bottom' && dy1 > dy2) {
        path = `M ${dx1} ${dy1} L ${dx1} ${midY} L ${dx2} ${midY} L ${dx2} ${dy2}`;
      } else if (anchor1 === 'left' && anchor2 === 'right' && dx1 > dx2) {
        path = `M ${dx1} ${dy1} L ${midX} ${dy1} L ${midX} ${dy2} L ${dx2} ${dy2}`;
      } else {
        const offset = Math.min(Math.abs(dx1 - dx2), Math.abs(dy1 - dy2), 40) + 10;
        const p1x = anchor1 === 'right' ? dx1 + offset : anchor1 === 'left' ? dx1 - offset : dx1;
        const p1y = anchor1 === 'bottom' ? dy1 + offset : anchor1 === 'top' ? dy1 - offset : dy1;
        const p2x = anchor2 === 'right' ? dx2 + offset : anchor2 === 'left' ? dx2 - offset : dx2;
        const p2y = anchor2 === 'bottom' ? dy2 + offset : anchor2 === 'top' ? dy2 - offset : dy2;
        
        if (Math.abs(p1x - p2x) < Math.abs(p1y - p2y)) {
           path = `M ${dx1} ${dy1} L ${p1x} ${p1y} L ${p1x} ${p2y} L ${p2x} ${p2y} L ${dx2} ${dy2}`;
        } else {
           path = `M ${dx1} ${dy1} L ${p1x} ${p1y} L ${p2x} ${p1y} L ${p2x} ${p2y} L ${dx2} ${dy2}`;
        }
      }
    } else {
      if (anchor1 === 'bottom' && anchor2 === 'top' && dy2 > dy1) {
        path = `M ${dx1} ${dy1} C ${dx1} ${midY}, ${dx2} ${midY}, ${dx2} ${dy2}`;
      } else if (anchor1 === 'right' && anchor2 === 'left' && dx2 > dx1) {
        path = `M ${dx1} ${dy1} C ${midX} ${dy1}, ${midX} ${dy2}, ${dx2} ${dy2}`;
      } else if (anchor1 === 'top' && anchor2 === 'bottom' && dy1 > dy2) {
         path = `M ${dx1} ${dy1} C ${dx1} ${midY}, ${dx2} ${midY}, ${dx2} ${dy2}`;
      } else if (anchor1 === 'left' && anchor2 === 'right' && dx1 > dx2) {
         path = `M ${dx1} ${dy1} C ${midX} ${dy1}, ${midX} ${dy2}, ${dx2} ${dy2}`;
      } else {
        const offset = Math.min(Math.abs(dx1 - dx2), Math.abs(dy1 - dy2), 50);
        path = `M ${dx1} ${dy1} C ${anchor1==='right'?dx1+offset:anchor1==='left'?dx1-offset:dx1} ${anchor1==='bottom'?dy1+offset:anchor1==='top'?dy1-offset:dy1},
                                 ${anchor2==='right'?dx2+offset:anchor2==='left'?dx2-offset:dx2} ${anchor2==='bottom'?dy2+offset:anchor2==='top'?dy2-offset:dy2},
                                 ${dx2} ${dy2}`;
      }
    }

    const dash = t.tipoLinea === 'punteada' ? '4 4' : t.tipoLinea === 'discontinua' ? '10 5' : '';
    return {
      id: t.id, path, origenId: t.origenId, destinoId: t.destinoId,
      x1: dx1, y1: dy1, x2: dx2, y2: dy2,
      label: t.etiqueta || '', labelX: midX, labelY: midY - 8,
      color: t.color || '#475569', dash, width: t.grosor || 2, trans: t,
    };
  }

  private calculateBestAnchor(sourceId: string, targetId: string, isDest: boolean): 'top' | 'bottom' | 'left' | 'right' {
    const sPos = this.getNodoPos(sourceId);
    const tPos = this.getNodoPos(targetId);
    const sNode = this.actividadesMap.get(sourceId);
    const tNode = this.actividadesMap.get(targetId);
    if (!sPos || !tPos || !sNode || !tNode) return isDest ? 'top' : 'bottom';

    const sCenterX = sPos.x + (sNode.ancho || this.NW) / 2;
    const sCenterY = sPos.y + (sNode.alto || this.NH) / 2;
    const tCenterX = tPos.x + (tNode.ancho || this.NW) / 2;
    const tCenterY = tPos.y + (tNode.alto || this.NH) / 2;

    const dx = tCenterX - sCenterX;
    const dy = tCenterY - sCenterY;

    const sLaneIdx = this.nodeToLaneMap.get(sourceId);
    const tLaneIdx = this.nodeToLaneMap.get(targetId);
    const sameLane = sLaneIdx != null && tLaneIdx != null && sLaneIdx === tLaneIdx;
    const horizontalBias = sameLane ? 0.6 : 2.5; 
    
    if (!sameLane && Math.abs(dy) < 300) {
       if (isDest) return dx > 0 ? 'left' : 'right';
       return dx > 0 ? 'right' : 'left';
    }
    
    if (Math.abs(dx) * horizontalBias > Math.abs(dy)) {
      if (isDest) return dx > 0 ? 'left' : 'right';
      return dx > 0 ? 'right' : 'left';
    } else {
      if (isDest) return dy > 0 ? 'top' : 'bottom';
      return dy > 0 ? 'bottom' : 'top';
    }
  }

  findNodeAnchor(actId: string, anchor?: 'top' | 'bottom' | 'left' | 'right', isDest = false): { x: number; y: number } | null {
    if (!this.sel()) return null;
    const a = this.actividadesMap.get(actId);
    if (a) {
      const pos = this.getNodoPos(actId);
      const w = a.ancho || this.NW;
      const h = a.alto || this.NH;
      const type = anchor || (isDest ? 'top' : 'bottom');
      const pad = 2;
      switch(type) {
        case 'top':    return { x: pos.x + w/2, y: pos.y - pad };
        case 'bottom': return { x: pos.x + w/2, y: pos.y + h + pad };
        case 'left':   return { x: pos.x - pad, y: pos.y + h/2 };
        case 'right':  return { x: pos.x + w + pad, y: pos.y + h/2 };
      }
    }
    return null;
  }

  getSourceCenter(): { x: number; y: number } | null {
    const mode = this.connMode();
    if (this.isCreatingConn && this.tempConnSource) {
      return this.findNodeAnchor(this.tempConnSource.id, this.tempConnAnchor, false);
    }
    if (!mode.sourceId || !this.sel()) return null;
    return this.findNodeAnchor(mode.sourceId, 'bottom', false);
  }

  selectTransicion(t: Transicion): void {
    this.nodoSeleccionado.set(null);
    this.calleSeleccionada.set(null);
    this.transicionSeleccionada.set(t);
    if (!t.color) t.color = '#475569';
    if (!t.tipoLinea) t.tipoLinea = 'solida';
    if (!t.grosor) t.grosor = 2;
    if (!t.enrutamiento) t.enrutamiento = 'ortogonal';
    if (!t.origenAnchor) t.origenAnchor = 'auto';
    if (!t.destinoAnchor) t.destinoAnchor = 'auto';
  }

  // ── Helper Visuals ──
  getAccent(t: string): string { 
    return ({ INICIO: '#10b981', FIN: '#ef4444', TAREA: '#6366f1', DECISION: '#f59e0b', FORK: '#a855f7', JOIN: '#a855f7' } as any)[t] || '#64748b'; 
  }
  
  getAccentBg(t: string): string { 
    return this.getAccent(t) + '18'; 
  }
  
  getCategory(t: string): string { 
    return ({ INICIO: 'TRIGGER', FIN: 'END', TAREA: 'ACTION', DECISION: 'LOGIC', FORK: 'PARALLEL', JOIN: 'SYNC' } as any)[t] || 'NODE'; 
  }

  getFindingForNode(nodeId: string) {
    return this.mlFindingsMap()[nodeId] || null;
  }

  getNombreNodo(nodeId: string): string {
    const p = this.sel();
    if (!p) return 'Desconocido';
    for (const c of p.calles) {
      const a = c.actividades.find(act => act.id === nodeId);
      if (a) return a.nombre;
    }
    return 'Desconocido';
  }

  getNombreActividad(id: string): string {
    const p = this.sel();
    for (const c of p?.calles || []) { 
      const a = c.actividades.find(a => a.id === id); 
      if (a) return a.nombre; 
    }
    return id.substring(0, 8);
  }

  getAllActividades(): Actividad[] { 
    return this.sel()?.calles.flatMap(c => c.actividades) || []; 
  }

  onNodeMouseEnter(id: string): void { this.hoveredNodeId = id; }
  onNodeMouseLeave(): void { this.hoveredNodeId = null; }

  avanzarSimulacion(actId: string): void {
    if (this.isSimulating()) {
      this.onAvanzarSimulacion.emit(actId);
    }
  }

  eliminarCalle(ci: number): void {
    this.onDeleteCalle.emit(ci);
  }

  trackById(index: number, item: any): string { return item.id; }
  trackByConnId(index: number, item: any): string { return item.id; }
}

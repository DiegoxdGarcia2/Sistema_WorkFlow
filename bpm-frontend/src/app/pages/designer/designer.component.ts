import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PoliticaService } from '../../services/politica.service';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../models/bpm.models';
import { AuthService } from '../../services/auth.service';

interface FormField { key: string; label: string; type: string; required: boolean; options?: string[]; }

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  dragNodeKey = '';
  dragOffsetX = 0;
  dragOffsetY = 0;
  dragOriginCi = -1;
  dragOriginAi = -1;
  hoveredLaneIdx = -1;
  nodePositions: Record<string, { x: number; y: number }> = {};

  // ── Lane Drag Reorder ──
  isDraggingLane = false;
  dragLaneIdx = -1;
  dragLaneOverIdx = -1;

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
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      this.projectId = p['projectId'] || null;
      this.projectName = p['projectName'] || null;
    });
    this.cargarPoliticas();
  }
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
      for (let ai = 0; ai < this.sel.calles[ci].actividades.length; ai++) {
        const act = this.sel.calles[ci].actividades[ai];
        const w = act.ancho || this.NW;
        if (act.posX != null && act.posY != null && act.posX > 0) {
          this.nodePositions[`${ci}-${ai}`] = { x: act.posX, y: act.posY };
        } else {
          this.nodePositions[`${ci}-${ai}`] = {
            x: ci * this.LW + (this.LW - w) / 2,
            y: this.TOP + ai * (this.NH + this.NG),
          };
        }
      }
    }
  }

  getNodoPos(ci: number, ai: number): { x: number; y: number } {
    return this.nodePositions[`${ci}-${ai}`] || { x: ci * this.LW + 30, y: this.TOP + ai * 136 };
  }
  getLaneX(ci: number): number { return ci * this.LW; }

  getCanvasW(): number { return Math.max((this.sel?.calles.length || 1) * this.LW + 40, 600); }
  getCanvasH(): number {
    if (!this.sel) return 600;
    let maxN = 1;
    for (const c of this.sel.calles) maxN = Math.max(maxN, c.actividades.length);
    return Math.max(this.TOP + maxN * (this.NH + this.NG) + 120, 600);
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
        });
        this.showToast('Conexión creada', 'success');
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
    this.generateLayout();
    this.triggerAutoSave();
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
    this.showToast(`Movido a ${this.sel.calles[targetCi].nombre}`, 'success');
  }

  // ── Drag ──
  onNodoMouseDown(e: MouseEvent, ci: number, ai: number): void {
    if (this.connMode.active) return;
    e.preventDefault();
    const key = `${ci}-${ai}`, pos = this.nodePositions[key];
    if (!pos) return;
    this.dragNodeKey = key;
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

    if (!this.isDragging || !this.dragNodeKey) return;
    // Only move the dragged node, never connected nodes
    this.nodePositions[this.dragNodeKey] = { x: this.mouseX - (this.NW / 2), y: this.mouseY - (this.NH / 2) };
    // Update only this node's position reference — do NOT trigger generateLayout
    this.hoveredLaneIdx = Math.floor(this.mouseX / this.LW);
    if (this.hoveredLaneIdx < 0) this.hoveredLaneIdx = 0;
    if (this.sel && this.hoveredLaneIdx >= this.sel.calles.length) this.hoveredLaneIdx = this.sel.calles.length - 1;
  }

  onCanvasMouseUp(): void {
    if (this.isDragging && this.sel && this.dragNodeKey) {
      const targetLane = this.hoveredLaneIdx;
      if (targetLane >= 0 && targetLane !== this.dragOriginCi) {
        const node = this.sel.calles[this.dragOriginCi].actividades.splice(this.dragOriginAi, 1)[0];
        // Snap into new lane center
        const newAi = this.sel.calles[targetLane].actividades.length;
        node.posX = targetLane * this.LW + (this.LW - (node.ancho || this.NW)) / 2;
        node.posY = this.mouseY - this.NH / 2;
        this.sel.calles[targetLane].actividades.push(node);
        this.showToast(`Movido a ${this.sel.calles[targetLane].nombre}`, 'success');
      }
      this.persistPositions();
      this.generateLayout();
      this.triggerAutoSave();
      setTimeout(() => this.isDragging = false, 50);
    }
    this.dragNodeKey = '';
    this.hoveredLaneIdx = -1;
    this.dragOriginCi = -1;
  }

  private persistPositions(): void {
    if (!this.sel) return;
    for (let ci = 0; ci < this.sel.calles.length; ci++) {
      for (let ai = 0; ai < this.sel.calles[ci].actividades.length; ai++) {
        const pos = this.nodePositions[`${ci}-${ai}`];
        if (pos) {
          this.sel.calles[ci].actividades[ai].posX = pos.x;
          this.sel.calles[ci].actividades[ai].posY = pos.y;
        }
      }
    }
  }

  // ── Connection Mode ──
  startConnMode(tipo: TipoRuta): void {
    this.connMode = { active: true, tipo, sourceId: null };
    this.nodoSeleccionado = null;
    this.transicionSeleccionada = null;
  }
  cancelConnMode(): void { this.connMode = { active: false, tipo: 'SECUENCIAL', sourceId: null }; }

  getSourceCenter(): { x: number; y: number } | null {
    if (!this.connMode.sourceId || !this.sel) return null;
    return this.findNodeCenter(this.connMode.sourceId);
  }

  // ── SVG Connections ──
  getConnectionPaths(): { id: string; path: string; origenId: string; destinoId: string; label: string; labelX: number; labelY: number; color: string; dash: string; width: number; trans: Transicion }[] {
    if (!this.sel) return [];
    return this.sel.transiciones.map(t => {
      const from = this.findNodeCenter(t.origenId);
      const to = this.findNodeCenter(t.destinoId);
      if (!from || !to) return null;
      const y1 = from.y + this.NH / 2;
      const y2 = to.y - this.NH / 2;
      const x1 = from.x, x2 = to.x;
      const midY = (y1 + y2) / 2;
      let path: string;
      if (y2 > y1) {
        path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      } else {
        const off = 60;
        path = `M ${x1} ${y1} C ${x1 + off} ${y1 + off}, ${x2 + off} ${y2 - off}, ${x2} ${y2}`;
      }
      const dash = t.tipoLinea === 'punteada' ? '4 4' : t.tipoLinea === 'discontinua' ? '10 5' : '';
      return {
        id: t.id, path, origenId: t.origenId, destinoId: t.destinoId,
        label: t.etiqueta || '', labelX: (x1 + x2) / 2, labelY: midY - 8,
        color: t.color || '#475569', dash, width: t.grosor || 2, trans: t,
      };
    }).filter(Boolean) as any[];
  }

  findNodeCenter(actId: string): { x: number; y: number } | null {
    if (!this.sel) return null;
    for (let ci = 0; ci < this.sel.calles.length; ci++) {
      const ai = this.sel.calles[ci].actividades.findIndex(a => a.id === actId);
      if (ai >= 0) {
        const pos = this.getNodoPos(ci, ai);
        const w = this.sel.calles[ci].actividades[ai].ancho || this.NW;
        return { x: pos.x + w / 2, y: pos.y + this.NH / 2 };
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
      next: (created) => { this.mostrarModalCrear = false; this.nuevaPolitica = { nombre: '', descripcion: '' }; this.cargarPoliticas(); this.seleccionar(created); this.showToast('Política creada', 'success'); },
      error: (e) => this.errorCrear = e.error?.message || 'Error al crear.',
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
      next: (u) => {
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
      error: (e) => { this.saveStatus = 'error'; this.showToast(e.error?.message || 'Error al guardar', 'error'); },
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
    if (!this.sel || this.dragLaneIdx < 0 || this.dragLaneIdx === ci) { this.isDraggingLane = false; this.dragLaneIdx = -1; this.dragLaneOverIdx = -1; return; }
    const lane = this.sel.calles.splice(this.dragLaneIdx, 1)[0];
    this.sel.calles.splice(ci, 0, lane);
    // Reset ALL node positions so they recalculate into correct lane columns
    for (const calle of this.sel.calles) {
      for (const act of calle.actividades) {
        act.posX = undefined;
        act.posY = undefined;
      }
    }
    this.sel.calles.forEach((c, i) => c.orden = i);
    this.generateLayout();
    this.triggerAutoSave();
    this.showToast('Orden actualizado', 'success');
    this.isDraggingLane = false;
    this.dragLaneIdx = -1;
    this.dragLaneOverIdx = -1;
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
      next: (created) => {
        this.cargarPoliticas();
        this.seleccionar(created);
        this.showToast(`Versión ${body.version} creada (borrador)`, 'success');
      },
      error: (e) => this.showToast(e.error?.message || 'Error al crear versión', 'error'),
    });
  }
  activarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.activar(this.sel.id).subscribe({
      next: (u) => { this.sel = JSON.parse(JSON.stringify(u)); this.cargarPoliticas(); this.showToast('Política publicada', 'success'); },
      error: (e) => this.showToast(e.error?.message || 'Error al activar', 'error'),
    });
  }
  confirmarEliminar(): void { this.mostrarConfirmEliminar = true; }
  eliminarPolitica(): void {
    if (!this.sel) return;
    this.politicaService.eliminar(this.sel.id).subscribe({
      next: () => { this.sel = null; this.nodoSeleccionado = null; this.mostrarConfirmEliminar = false; this.cargarPoliticas(); this.showToast('Política eliminada', 'success'); },
      error: (e) => { this.mostrarConfirmEliminar = false; this.showToast(e.error?.message || 'Error al eliminar', 'error'); },
    });
  }

  // ── CRUD: Calles ──
  agregarCalle(): void {
    if (!this.sel || !this.nuevaCalleNombre.trim()) return;
    this.sel.calles.push({ id: crypto.randomUUID(), nombre: this.nuevaCalleNombre.trim(), orden: this.sel.calles.length, color: this.nuevaCalleColor, actividades: [] });
    this.nuevaCalleNombre = '';
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
    this.formFields = (this.nodoSeleccionado.esquemaFormulario as any).fields || [];
  }
  addFormField(): void {
    this.formFields.push({ key: `field_${Date.now()}`, label: '', type: 'text', required: false });
  }
  removeFormField(i: number): void { this.formFields.splice(i, 1); }
  saveFormFields(): void {
    if (!this.sel || !this.nodoSeleccionado) return;
    const act = this.sel.calles[this.editCalleIdx].actividades[this.editActIdx];
    act.esquemaFormulario = { fields: this.formFields };
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
}

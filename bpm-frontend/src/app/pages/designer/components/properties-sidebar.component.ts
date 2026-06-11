import { Component, input, model, output, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoliticaDTO, Actividad, Calle, Transicion, TipoActividad, TipoRuta } from '../../../models/bpm.models';
import { AdminService, Departamento } from '../../../services/admin.service';
import { FormularioService, FormularioTemplate } from '../../../services/formulario.service';
import { AnalysisResult } from '../../../services/ml-analysis.service';

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
  selector: 'app-properties-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties-sidebar.component.html',
  encapsulation: ViewEncapsulation.None
})
export class PropertiesSidebarComponent {
  // ── Models & Inputs ──
  sel = model<PoliticaDTO | null>(null);
  nodoSeleccionado = model<Actividad | null>(null);
  calleSeleccionada = model<Calle | null>(null);
  transicionSeleccionada = model<Transicion | null>(null);
  
  editCalleIdx = model<number>(0);
  editActIdx = model<number>(0);
  activeTab = model<'general' | 'estilo' | 'formulario' | 'conexiones'>('general');
  formFields = model<FormField[]>([]);
  
  filteredPoliticas = input<PoliticaDTO[]>([]);
  activeSimNodes = input<string[]>([]);
  isSimulating = input<boolean>(false);
  simLog = input<string[]>([]);
  showMlPanel = model<boolean>(false);
  mlResult = input<AnalysisResult | null>(null);
  isAnalyzingMl = input<boolean>(false);
  
  templates = input<FormularioTemplate[]>([]);
  departamentos = input<Departamento[]>([]);

  // ── Outputs ──
  onSave = output<void>();
  onBroadcast = output<void>();
  onShowToast = output<{ msg: string; type: 'success' | 'error' | 'info' }>();
  onStopSimulation = output<void>();
  onPickSimPath = output<string>();
  onAddCalleClick = output<void>();
  onPublish = output<void>();
  onCreateVersion = output<void>();
  onConfirmDeletePolicy = output<void>();
  onDeleteNode = output<void>();
  onDeleteTransicion = output<string>();
  onDeleteCalle = output<number>();
  onLayoutNeedUpdate = output<void>();

  // ── Palettes & Configurations ──
  nodeColors = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#475569','#10b981','#e11d48'];
  laneColors = ['#475569','#6366f1','#8b5cf6','#06b6d4','#22c55e','#f97316','#e11d48','#3b82f6'];
  connColors = ['#475569','#6366f1','#818cf8','#22c55e','#f97316','#ef4444','#8b5cf6','#06b6d4'];
  fontSizes = [{v:'sm',l:'S'},{v:'md',l:'M'},{v:'lg',l:'L'}];

  // ── Services ──
  adminSvc = inject(AdminService);
  fs = inject(FormularioService);

  // ── Change Handlers ──
  onNodeChange(): void {
    const act = this.nodoSeleccionado();
    if (act) {
      this.onLayoutNeedUpdate.emit();
      this.onBroadcast.emit();
      this.onSave.emit();
    }
  }

  onNodeLaneChange(newCi: number): void {
    const p = this.sel();
    const currentCi = this.editCalleIdx();
    const currentAi = this.editActIdx();
    if (!p || newCi === currentCi) return;

    const node = p.calles[currentCi].actividades.splice(currentAi, 1)[0];
    node.posX = undefined;
    node.posY = undefined;
    p.calles[newCi].actividades.push(node);
    
    this.editCalleIdx.set(newCi);
    this.editActIdx.set(p.calles[newCi].actividades.length - 1);
    
    this.sel.set({ ...p });
    this.onLayoutNeedUpdate.emit();
    this.onBroadcast.emit();
    this.onSave.emit();
  }

  onTransChange(): void {
    this.onBroadcast.emit();
    this.onSave.emit();
  }

  onCalleChange(): void {
    const p = this.sel();
    const ci = this.editCalleIdx();
    if (p && ci >= 0) {
      p.calles = [...p.calles];
      this.sel.set({ ...p });
    }
    this.onBroadcast.emit();
    this.onSave.emit();
  }

  // ── CRUD methods inside Sidebar ──
  eliminarDocumentoRequerido(idx: number): void {
    const act = this.nodoSeleccionado();
    if (!act || !act.documentosRequeridos) return;
    this.onSave.emit(); // trigger undo history push in parent
    act.documentosRequeridos.splice(idx, 1);
    this.nodoSeleccionado.set({ ...act });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.onShowToast.emit({ msg: 'Documento requerido eliminado', type: 'success' });
  }

  agregarDocumentoRequerido(val: string): void {
    const act = this.nodoSeleccionado();
    if (!act) return;
    const trimmed = val.trim();
    if (!trimmed) return;
    this.onSave.emit();
    if (!act.documentosRequeridos) {
      act.documentosRequeridos = [];
    }
    act.documentosRequeridos.push(trimmed);
    this.nodoSeleccionado.set({ ...act });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.onShowToast.emit({ msg: 'Documento requerido añadido', type: 'success' });
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

  eliminarRequisitoInicial(idx: number): void {
    const p = this.sel();
    if (!p || !p.requisitosIniciales) return;
    this.onSave.emit();
    const reqs = [...p.requisitosIniciales];
    reqs.splice(idx, 1);
    p.requisitosIniciales = reqs;
    this.sel.set({ ...p });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.onShowToast.emit({ msg: 'Requisito inicial eliminado', type: 'success' });
  }

  cargarRequisitosDesdePlantilla(templateId: string): void {
    const p = this.sel();
    if (!p || !templateId) return;
    const t = this.templates().find(x => x.id === templateId);
    if (!t) return;

    this.onSave.emit();
    if (!p.requisitosIniciales) {
      p.requisitosIniciales = [];
    }

    const reqs = [...p.requisitosIniciales];
    let count = 0;
    t.campos.forEach(c => {
      const label = c.label.trim();
      if (!label) return;

      let prefix = '[Texto]';
      if (c.type === 'file') prefix = '[Archivo]';
      else if (c.type === 'number') prefix = '[Número]';
      else if (c.type === 'date') prefix = '[Fecha]';
      else if (c.type === 'select') prefix = '[Selección]';

      const formatted = `${prefix} ${label}`;

      const exists = reqs.some(r => this.getCleanReqName(r).toLowerCase() === label.toLowerCase());
      if (!exists) {
        reqs.push(formatted);
        count++;
      }
    });

    p.requisitosIniciales = reqs;
    this.sel.set({ ...p });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.onShowToast.emit({ msg: `Se cargaron ${count} requisitos de la plantilla "${t.nombre}"`, type: 'success' });
  }

  agregarRequisitoInicialConTipo(prefix: string, val: string): void {
    const p = this.sel();
    if (!p) return;
    const trimmed = val.trim();
    if (!trimmed) return;
    this.onSave.emit();
    if (!p.requisitosIniciales) {
      p.requisitosIniciales = [];
    }
    const formatted = `${prefix} ${trimmed}`;
    
    const exists = p.requisitosIniciales.some(r => this.getCleanReqName(r).toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      this.onShowToast.emit({ msg: 'Ya existe un requisito con ese nombre', type: 'error' });
      return;
    }

    p.requisitosIniciales = [...p.requisitosIniciales, formatted];
    this.sel.set({ ...p });
    this.onBroadcast.emit();
    this.onSave.emit();
    this.onShowToast.emit({ msg: 'Requisito inicial añadido', type: 'success' });
  }

  loadFormFields(): void {
    const act = this.nodoSeleccionado();
    if (!act?.esquemaFormulario) {
      this.formFields.set([]);
      return;
    }
    const fields = (act.esquemaFormulario as any).fields || [];
    this.formFields.set(fields.map((f: any) => ({
      ...f,
      validations: f.validations || {}
    })));
  }

  addFormField(): void {
    const fields = [...this.formFields()];
    fields.push({ 
      key: `field_${Date.now()}`, 
      label: '', 
      type: 'text', 
      required: false,
      validations: {
        min: undefined,
        max: undefined
      } 
    });
    this.formFields.set(fields);
    this.saveFormFields();
    this.onSave.emit();
  }

  removeFormField(i: number): void { 
    const fields = [...this.formFields()];
    fields.splice(i, 1);
    this.formFields.set(fields);
    this.saveFormFields();
    this.onSave.emit();
  }

  saveFormFields(): void {
    const p = this.sel();
    const act = this.nodoSeleccionado();
    const ci = this.editCalleIdx();
    const ai = this.editActIdx();
    if (!p || !act) return;
    
    p.calles[ci].actividades[ai].esquemaFormulario = { fields: [...this.formFields()] };
    this.sel.set({ ...p });
  }

  getSalidasNodo(nodeId: string): Transicion[] {
    const p = this.sel();
    if (!p) return [];
    return p.transiciones.filter(t => t.origenId === nodeId);
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

  eliminarTransicion(id: string): void {
    const p = this.sel();
    if (!p) return;
    p.transiciones = p.transiciones.filter(t => t.id !== id);
    this.sel.set({ ...p });
    this.onSave.emit();
  }

  getNombreActividad(id: string): string {
    const p = this.sel();
    for (const c of p?.calles || []) {
      const a = c.actividades.find(a => a.id === id);
      if (a) return a.nombre;
    }
    return id.substring(0, 8);
  }

  eliminarTransicionById(id: string): void {
    this.onDeleteTransicion.emit(id);
  }

  cargarPlantilla(templateId: string) {
    const act = this.nodoSeleccionado();
    if (!act) return;
    const t = this.templates().find(x => x.id === templateId);
    if (!t) return;

    const fields = t.campos.map(c => ({
      key: c.key,
      label: c.label,
      type: c.type,
      required: c.required,
      options: c.options ? [...c.options] : undefined,
      validations: c.validations ? { ...c.validations } : {}
    }));

    act.plantillaId = t.id;
    act.esquemaFormulario = { fields };
    this.nodoSeleccionado.set({ ...act });
    this.formFields.set(fields);
    this.saveFormFields();
    this.onNodeChange();
  }

  eliminarCalle(idx: number): void {
    this.onDeleteCalle.emit(idx);
  }

  eliminarNodoSeleccionado(): void {
    this.onDeleteNode.emit();
  }

  get siguienteVersion(): number {
    const p = this.sel();
    if (!p) return 1;
    const mismasVersiones = this.filteredPoliticas().filter(x => x.nombre === p.nombre);
    if (mismasVersiones.length === 0) return p.version + 1;
    return Math.max(...mismasVersiones.map(x => x.version)) + 1;
  }

  crearNuevaVersion(): void {
    this.onCreateVersion.emit();
  }

  activarPolitica(): void {
    this.onPublish.emit();
  }

  confirmarEliminar(): void {
    this.onConfirmDeletePolicy.emit();
  }

  getAccent(t: string): string {
    return ({ INICIO: '#10b981', FIN: '#ef4444', TAREA: '#6366f1', DECISION: '#f59e0b', FORK: '#a855f7', JOIN: '#a855f7' } as any)[t] || '#64748b';
  }

  getAccentBg(t: string): string {
    return this.getAccent(t) + '18';
  }

  getCategory(t: string): string {
    return ({ INICIO: 'TRIGGER', FIN: 'END', TAREA: 'ACTION', DECISION: 'LOGIC', FORK: 'PARALLEL', JOIN: 'SYNC' } as any)[t] || 'NODE';
  }

  stopSimulation(): void {
    this.onStopSimulation.emit();
  }

  pickSimPath(transId: string): void {
    this.onPickSimPath.emit(transId);
  }

  agregarCalleModal(): void {
    this.onAddCalleClick.emit();
  }
}

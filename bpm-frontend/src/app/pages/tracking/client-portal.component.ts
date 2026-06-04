import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { TrackingDTO } from '../../models/bpm.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100">
      <!-- Navbar -->
      <nav class="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">⚡</div>
            <div>
              <h2 class="text-sm font-bold tracking-tight">Portal del Cliente</h2>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest">{{ user?.nombre }} {{ user?.apellido }}</p>
            </div>
          </div>
          <button (click)="logout()" class="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main class="max-w-5xl mx-auto px-6 py-10">
        <header class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 class="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Mis Trámites</h1>
            <p class="text-slate-500 text-sm">Gestiona y haz seguimiento a todos tus procesos activos.</p>
          </div>
          
          <!-- KPIs: Only show when not loading -->
          @if (!loading && !error) {
            <div class="flex gap-4 animate-fade-in">
              <div class="px-6 py-4 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total</p>
                <p class="text-2xl font-black text-white">{{ misTramites.length }}</p>
              </div>
              <div class="px-6 py-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
                <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">En Progreso</p>
                <p class="text-2xl font-black text-indigo-400">{{ getCountByEstado('EN_PROGRESO') + getCountByEstado('INICIADO') }}</p>
              </div>
              <div class="px-6 py-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
                <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Finalizados</p>
                <p class="text-2xl font-black text-emerald-400">{{ getCountByEstado('COMPLETADO') }}</p>
              </div>
            </div>
          }
        </header>

        <!-- AI Assistant Widget -->
        <div class="mb-10 p-1 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <div class="bg-slate-950 rounded-[22px] p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <!-- Background Decoration -->
            <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
            
            <div class="w-16 h-16 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            
            <div class="flex-1 w-full">
              <h3 class="text-lg font-bold text-white mb-2">Asistente Inteligente</h3>
              <p class="text-sm text-slate-400 mb-4">Escribe o dicta lo que necesitas y la IA iniciará el trámite adecuado por ti.</p>
              
              <div class="relative flex gap-2">
                <input type="text" [(ngModel)]="aiPrompt" (keyup.enter)="enviarPromptAI()"
                       [disabled]="aiLoading"
                       placeholder="Ej: Quiero solicitar la instalación de un nuevo medidor..."
                       class="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 disabled:opacity-50">
                
                <button (click)="toggleMicrophone()" [disabled]="aiLoading"
                        class="px-4 rounded-xl border flex items-center justify-center transition-all group shrink-0"
                        [class.bg-red-500]="isListening" [class.border-red-400]="isListening" [class.text-white]="isListening"
                        [class.bg-slate-800]="!isListening" [class.border-slate-700]="!isListening" [class.text-slate-400]="!isListening"
                        [class.hover:bg-slate-700]="!isListening" [class.opacity-50]="aiLoading">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [class.animate-pulse]="isListening"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                </button>
                
                <button (click)="enviarPromptAI()" [disabled]="!aiPrompt.trim() || aiLoading || isListening"
                        class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                  @if(aiLoading) {
                    <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Procesando...
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg> Solicitar
                  }
                </button>
              </div>

              <!-- AI Status/Message -->
              @if (aiMessage) {
                <div class="mt-4 p-4 rounded-xl text-sm border flex items-start gap-3 animate-fade-in"
                     [class.bg-emerald-500/10]="aiSuccess" [class.border-emerald-500/20]="aiSuccess" [class.text-emerald-400]="aiSuccess"
                     [class.bg-red-500/10]="!aiSuccess" [class.border-red-500/20]="!aiSuccess" [class.text-red-400]="!aiSuccess">
                  @if(aiSuccess) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  }
                  <div class="flex-1">
                    <p class="font-bold mb-1">{{ aiSuccess ? '¡Trámite Creado!' : 'Solicitud Rechazada' }}</p>
                    <p class="text-xs opacity-90">{{ aiMessage }}</p>
                  </div>
                  <button (click)="aiMessage = ''" class="text-slate-500 hover:text-white shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
              }
            </div>
          </div>
        </div>

        @if (loading) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p class="text-slate-500 text-sm">Cargando tus trámites...</p>
          </div>
        } @else if (error) {
          <div class="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 text-center">
            <p class="text-red-400 mb-2">❌ {{ error }}</p>
            <button (click)="cargarMisTramites()" class="text-indigo-400 text-xs font-bold hover:underline">Reintentar</button>
          </div>
        } @else if (misTramites.length === 0) {
          <div class="text-center py-32 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
            <div class="text-5xl mb-6 opacity-20">📂</div>
            <h3 class="text-xl font-bold text-slate-300">No tienes trámites registrados</h3>
            <p class="text-slate-500 text-sm mt-2">Cuando inicies un trámite en la institución, aparecerá aquí.</p>
          </div>
        } @else {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Sidebar: Lista de trámites -->
            <div class="lg:col-span-1 space-y-4">
              <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Selecciona un Trámite</h3>
              @for (t of misTramites; track t.tramite.id) {
                <div (click)="seleccionarTramite(t)"
                     [class.ring-2]="selectedTracking?.tramite?.id === t.tramite.id"
                     [class.ring-indigo-500]="selectedTracking?.tramite?.id === t.tramite.id"
                     [class.bg-slate-900]="selectedTracking?.tramite?.id === t.tramite.id"
                     class="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 cursor-pointer transition-all group">
                  <div class="flex justify-between items-start mb-3">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase ring-1 ring-inset"
                          [class]="getEstadoTramiteClasses(t.tramite.estado)">
                      {{ t.tramite.estado }}
                    </span>
                    <span class="text-[10px] text-slate-500">{{ t.tramite.iniciadoEn | date:'dd/MM/yy' }}</span>
                  </div>
                  <h4 class="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors mb-1">{{ t.tramite.politicaNombre }}</h4>
                  <p class="text-[10px] text-slate-500 font-mono">ID: {{ t.tramite.id }}</p>
                </div>
              }
            </div>

            <!-- Detalle del Trámite -->
            <div class="lg:col-span-2">
              @if (selectedTracking) {
                <div class="animate-fade-in">
                   <!-- Info Card -->
                   <div class="mb-8 p-8 rounded-3xl border border-slate-800 bg-indigo-500/5 relative overflow-hidden">
                      <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      <div class="relative flex items-center justify-between mb-8">
                        <div>
                          <h2 class="text-2xl font-bold text-white">{{ selectedTracking.tramite.politicaNombre }}</h2>
                          <p class="text-xs text-slate-500 mt-1 font-mono">ID: {{ selectedTracking.tramite.id }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Estado Actual</p>
                          <p class="text-lg font-bold text-indigo-400">{{ selectedTracking.tramite.estado }}</p>
                        </div>
                      </div>

                      <!-- Progress -->
                      <div>
                        <div class="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                          <span>Progreso del Flujo</span>
                          <span class="text-indigo-400">{{ calcularProgreso(selectedTracking) }}%</span>
                        </div>
                        <div class="h-3 rounded-full bg-slate-800 overflow-hidden shadow-inner">
                          <div class="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-1000"
                               [style.width.%]="calcularProgreso(selectedTracking)"></div>
                        </div>
                      </div>
                   </div>

                   <!-- Timeline -->
                   <div class="space-y-6">
                      <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">📋 Historial de Pasos</h3>
                      <div class="relative pl-8">
                        <div class="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-800"></div>
                        
                        @for (p of selectedTracking.timeline; track p.registroId; let i = $index) {
                          <div class="relative mb-8 last:mb-0 group">
                            <!-- Dot -->
                            <div class="absolute left-[-23px] top-1 w-4 h-4 rounded-full border-4 border-slate-950 z-10 transition-transform group-hover:scale-125"
                                 [class.bg-emerald-500]="p.estado === 'HECHO'"
                                 [class.bg-amber-500]="p.estado === 'EN_PROGRESO'"
                                 [class.bg-slate-700]="p.estado === 'PENDIENTE'">
                            </div>
                            
                            <div class="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all">
                              <div class="flex justify-between items-start mb-2">
                                <div>
                                  <h4 class="font-bold text-slate-200">{{ p.actividadNombre }}</h4>
                                  <span class="text-[10px] text-slate-500">🏢 {{ p.calleNombre }}</span>
                                </div>
                                <span class="px-2 py-0.5 rounded text-[9px] font-bold ring-1 ring-inset"
                                      [class]="getEstadoPasoClasses(p.estado)">
                                  {{ p.estado }}
                                </span>
                              </div>
                              @if (p.notas) {
                                <p class="text-xs text-slate-400 mt-3 p-3 rounded-xl bg-slate-950/50 italic border border-slate-800/50">
                                  "{{ p.notas }}"
                                </p>
                              }
                              <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
                                <span class="text-[9px] text-slate-600 font-mono">REG: {{ p.registroId }}</span>
                                <span class="text-[10px] text-slate-500">{{ (p.completadoEn || p.asignadoEn) | date:'dd MMM yyyy, HH:mm' }}</span>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                   </div>
                </div>
              } @else {
                <div class="h-full flex flex-col items-center justify-center py-32 text-center opacity-30">
                  <div class="text-6xl mb-6">🔍</div>
                  <p class="text-sm font-medium">Selecciona un trámite de la lista para ver sus detalles</p>
                </div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .glass {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(20px);
    }
  `]
})
export class ClientPortalComponent implements OnInit {
  misTramites: TrackingDTO[] = [];
  selectedTracking: TrackingDTO | null = null;
  loading = false;
  error = '';
  user: any;

  aiPrompt = '';
  aiLoading = false;
  aiMessage = '';
  aiSuccess = false;
  isListening = false;
  recognition: any;
  initialPrompt = '';

  constructor(private http: HttpClient, private auth: AuthService, private cdr: ChangeDetectorRef) {
    this.user = this.auth.usuario();
  }

  ngOnInit(): void {
    this.cargarMisTramites();
  }

  initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        this.aiPrompt = this.initialPrompt + transcript;
        this.cdr.detectChanges();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.cdr.detectChanges();
      };
    }
  }

  toggleMicrophone() {
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    } else {
      this.initialPrompt = this.aiPrompt ? this.aiPrompt + ' ' : '';
      this.recognition.start();
      this.isListening = true;
    }
  }

  enviarPromptAI() {
    if (!this.aiPrompt.trim() || this.aiLoading) return;

    if (this.isListening) {
      this.toggleMicrophone();
    }

    this.aiLoading = true;
    this.aiMessage = '';

    this.http.post<any>(`${environment.apiUrl}/tramites/ai-iniciar`, { prompt: this.aiPrompt }).subscribe({
      next: (res) => {
        this.aiLoading = false;
        this.aiSuccess = res.success;
        this.aiMessage = res.message;
        this.cdr.detectChanges();
        if (res.success) {
          this.aiPrompt = '';
          this.cargarMisTramites(); // Recargar tramites
        }
      },
      error: (err) => {
        this.aiLoading = false;
        this.aiSuccess = false;
        this.aiMessage = err.error?.message || 'Error de conexión con el servicio de Inteligencia Artificial.';
        this.cdr.detectChanges();
      }
    });
  }

  cargarMisTramites() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();
    this.http.get<TrackingDTO[]>(`${environment.apiUrl}/tramites/mis-tramites`).subscribe({
      next: (data) => {
        this.misTramites = data;
        if (data.length > 0) {
          this.selectedTracking = data[0];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'No pudimos cargar tus trámites. Intenta de nuevo más tarde.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarTramite(t: TrackingDTO) {
    this.selectedTracking = t;
  }

  logout() {
    this.auth.logout();
  }

  calcularProgreso(t: TrackingDTO): number {
    if (!t.timeline || t.timeline.length === 0) return 0;
    if (t.tramite.estado === 'COMPLETADO') return 100;
    const hechos = t.timeline.filter((p: any) => p.estado === 'HECHO').length;
    return Math.round((hechos / t.timeline.length) * 100);
  }

  getCountByEstado(estado: string): number {
    return this.misTramites.filter(t => t.tramite.estado === estado).length;
  }

  getEstadoTramiteClasses(estado: string): string {
    const m: Record<string, string> = {
      INICIADO: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
      EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
      COMPLETADO: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
      CANCELADO: 'bg-red-500/10 text-red-400 ring-red-500/20',
    };
    return m[estado] || m['INICIADO'];
  }

  getEstadoPasoClasses(estado: string): string {
    const m: Record<string, string> = {
      HECHO: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
      EN_PROGRESO: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
      PENDIENTE: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
      BLOQUEADO: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',
    };
    return m[estado] || m['PENDIENTE'];
  }
}

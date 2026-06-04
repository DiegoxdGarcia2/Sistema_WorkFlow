import { Component, Input, Output, EventEmitter, inject, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-voice-filler-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    @keyframes wave-expand {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .animate-wave {
      animation: wave-expand 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .delay-1 { animation-delay: 0.6s; }
    .delay-2 { animation-delay: 1.2s; }
    .delay-3 { animation-delay: 1.8s; }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .shimmer-text {
      background: linear-gradient(90deg, rgba(93, 230, 255, 0.2) 25%, rgba(93, 230, 255, 0.8) 50%, rgba(93, 230, 255, 0.2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite linear;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .glass-panel {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .mic-active-glow {
      box-shadow: 0 0 35px rgba(93, 230, 255, 0.5), 0 0 70px rgba(93, 230, 255, 0.25);
    }
    
    .mic-success-glow {
      box-shadow: 0 0 35px rgba(52, 211, 153, 0.5), 0 0 70px rgba(52, 211, 153, 0.25);
    }

    .mic-error-glow {
      box-shadow: 0 0 35px rgba(248, 113, 113, 0.5), 0 0 70px rgba(248, 113, 113, 0.25);
    }

    .typing-cursor::after {
      content: '|';
      animation: blink 0.9s step-end infinite;
      color: #22d3ee;
      margin-left: 2px;
    }
    @keyframes blink { 50% { opacity: 0; } }

    .progress-stripe {
      background: repeating-linear-gradient(
        90deg,
        #22d3ee 0%,
        #6366f1 50%,
        #22d3ee 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.2s linear infinite;
    }
  `],
  template: `
    @if (visible) {
      <div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl transition-all duration-500 animate-in fade-in" id="voice-filler-modal">
        
        <!-- Header / Close Action -->
        <header class="fixed top-0 w-full flex justify-between items-center px-6 md:px-16 h-20">
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-2.5 rounded-full transition-all duration-300" 
                 [ngClass]="{
                   'bg-slate-400': state === 'idle',
                   'bg-cyan-400 animate-pulse': state === 'recording',
                   'bg-indigo-400': state === 'transcribing',
                   'bg-emerald-400': state === 'success',
                   'bg-red-400': state === 'error'
                 }"></div>
            <span class="text-xs font-bold text-slate-400 tracking-widest uppercase">Auto-llenado por Voz Inteligente</span>
          </div>
          <button class="w-10 h-10 flex items-center justify-center rounded-2xl glass-panel hover:bg-white/10 transition-all active:scale-95 text-slate-300" (click)="close()">
            <span>&#10005;</span>
          </button>
        </header>

        <!-- Main Interaction Area -->
        <main class="w-full max-w-2xl px-6 flex flex-col items-center">
          
          <!-- Pulse Animation & Mic Button Container -->
          <div class="relative flex items-center justify-center mb-16 h-48">
            
            <!-- Concentric Wave Rings (Visible only in recording state) -->
            @if (state === 'recording') {
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="absolute w-36 h-36 border border-cyan-400/30 rounded-full animate-wave"></div>
                <div class="absolute w-36 h-36 border border-cyan-400/20 rounded-full animate-wave delay-1"></div>
                <div class="absolute w-36 h-36 border border-cyan-400/10 rounded-full animate-wave delay-2"></div>
                <div class="absolute w-36 h-36 border border-cyan-400/5 rounded-full animate-wave delay-3"></div>
              </div>
            }

            <!-- Primary Mic Button -->
            <button (click)="handleMicClick()" 
                    class="relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 hover:scale-105 active:scale-90 group text-white"
                    [ngClass]="{
                      'bg-slate-800 border border-slate-700': state === 'idle',
                      'bg-cyan-500 mic-active-glow': state === 'recording',
                      'bg-indigo-600': state === 'transcribing',
                      'bg-emerald-500 mic-success-glow': state === 'success',
                      'bg-red-500 mic-error-glow': state === 'error'
                    }"
                    [disabled]="state === 'transcribing'">
              <span class="text-4xl">
                @if (state === 'idle') { 🎙️ }
                @else if (state === 'recording') { ⏹️ }
                @else if (state === 'transcribing') { 🔄 }
                @else if (state === 'success') { ✅ }
                @else if (state === 'error') { ⚠️ }
              </span>
            </button>

            <!-- Status Label -->
            <div class="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span class="text-xl font-bold tracking-wide transition-all duration-300"
                    [ngClass]="{
                      'text-slate-400': state === 'idle',
                      'text-cyan-400': state === 'recording',
                      'text-cyan-300 shimmer-text': state === 'transcribing',
                      'text-emerald-400': state === 'success',
                      'text-red-400': state === 'error'
                    }">
                {{ getStatusText() }}
              </span>
            </div>
          </div>

          <!-- Expected Fields Panel -->
          @if (state !== 'success' && fields && fields.length > 0) {
            <div class="w-full mt-6 animate-in fade-in duration-300">
               <div class="glass-panel p-5 rounded-3xl bg-slate-900/30">
                  <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Campos a dictar en el audio:</h4>
                  <div class="flex flex-wrap gap-2.5 max-h-32 overflow-y-auto pr-1">
                     @for (f of fields; track f.key) {
                       <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                          <span class="w-1.5 h-1.5 rounded-full"
                                [ngClass]="state === 'recording' ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-500'"></span>
                          <span class="text-xs font-semibold text-slate-300">{{ f.label }}</span>
                          <span class="text-[8px] font-bold font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md uppercase">
                            {{ f.type === 'file' ? 'archivo' : f.type }}
                          </span>
                          @if (f.options && f.options.length > 0) {
                            <div class="flex gap-1 ml-1">
                              @for (opt of f.options; track opt) {
                                <span class="text-[7px] text-slate-400 border border-slate-700 px-1 rounded-sm">{{ opt }}</span>
                              }
                            </div>
                          }
                       </div>
                     }
                  </div>
               </div>
            </div>
          }

          <!-- Transcription Preview Area -->
          <div class="w-full mt-8">
            <div class="glass-panel p-6 rounded-3xl shadow-2xl relative overflow-hidden">
              <!-- Ambient light effect -->
              <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              <div class="flex items-center gap-2 mb-3 opacity-60">
                <span class="text-xs">🗒️</span>
                <span class="text-[10px] font-bold tracking-widest uppercase">Vista Previa de Transcripción</span>
                <!-- Live recording indicator -->
                @if (state === 'recording') {
                  <span class="ml-auto flex items-center gap-1.5 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    EN VIVO
                  </span>
                }
              </div>
              
              <!-- Text area: shows live transcription or placeholder -->
              <div class="font-mono text-sm leading-relaxed min-h-[100px] max-h-[180px] overflow-y-auto"
                   [ngClass]="transcription ? 'text-slate-200' : 'text-slate-600 italic'">
                @if (transcription) {
                  <span>{{ liveTranscription }}</span>
                  @if (interimText) {
                    <span class="text-cyan-500/70 italic">{{ interimText }}</span>
                  }
                  @if (state === 'recording') {
                    <span class="typing-cursor"></span>
                  }
                } @else {
                  Presiona el micrófono y empieza a hablar para rellenar los datos. Por ejemplo: "El cliente se llama Juan Pérez, de teléfono 77889922 y tiene un medidor dañado..."
                }
              </div>

              <!-- Progress bar for "transcribing" state -->
              @if (state === 'transcribing') {
                <div class="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full progress-stripe rounded-full"></div>
                </div>
                <p class="text-[10px] text-slate-500 mt-2 text-center tracking-wider">Enviando audio a Whisper + Llama-3 para extracción...</p>
              }
            </div>

            <!-- Extracted Fields Preview Table (Success state) -->
            @if (state === 'success' && extractedValuesList.length > 0) {
              <div class="mt-6 animate-in slide-in-from-bottom-4">
                 <div class="glass-panel p-6 rounded-3xl">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Datos Estructurados Extraídos:</h4>
                    <div class="grid grid-cols-2 gap-4 max-h-[160px] overflow-y-auto pr-2">
                       @for (item of extractedValuesList; track item.key) {
                         <div class="flex flex-col p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                            <span class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{{ item.label }}</span>
                            <span class="text-sm font-semibold text-cyan-300 mt-1">{{ item.value === null || item.value === '' ? 'No detectado' : item.value }}</span>
                         </div>
                       }
                    </div>
                 </div>
              </div>
            }

            <!-- Action Controls -->
            <div class="flex justify-center gap-4 mt-8 transition-all duration-500" 
                 [class.opacity-0]="state === 'recording' || state === 'transcribing'"
                 [class.pointer-events-none]="state === 'recording' || state === 'transcribing'">
              
              <button (click)="retry()" class="px-6 h-12 flex items-center gap-2 rounded-full glass-panel hover:bg-white/10 text-slate-200 text-xs font-bold uppercase transition-all">
                <span>🔄</span> Reintentar
              </button>
              
              <button (click)="apply()" 
                      [disabled]="state !== 'success'" 
                      class="px-8 h-12 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-white text-xs font-bold uppercase shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none">
                <span>📥</span> Confirmar Llenado
              </button>
            </div>
          </div>

        </main>

        <!-- Footer Info -->
        <footer class="fixed bottom-6 flex gap-4">
          <div class="glass-panel px-4 py-1.5 rounded-full flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span class="text-[9px] font-bold text-slate-500 tracking-widest uppercase">NLP Whisper Engine</span>
          </div>
          <div class="glass-panel px-4 py-1.5 rounded-full flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span class="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Llama-3 Extractor</span>
          </div>
        </footer>

      </div>
    }
  `
})
export class VoiceFillerModalComponent implements OnDestroy {
  @Input() fields: any[] = [];
  @Input() visible: boolean = false;
  @Output() onClose = new EventEmitter<void>();
  @Output() onApplied = new EventEmitter<any>();

  state: 'idle' | 'recording' | 'transcribing' | 'success' | 'error' = 'idle';
  
  // Transcripción separada: texto final acumulado + texto interino actual
  liveTranscription: string = '';
  interimText: string = '';
  get transcription(): string { return this.liveTranscription || this.interimText; }

  extractedValues: any = {};
  extractedValuesList: Array<{ key: string, label: string, value: any }> = [];

  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private recognition: any = null;
  private processTimeout: any = null;
  private ngZone = inject(NgZone);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  getStatusText(): string {
    switch (this.state) {
      case 'idle': return 'Listo para Grabar';
      case 'recording': return 'Escuchando...';
      case 'transcribing': return 'Procesando Voz...';
      case 'success': return 'Datos Extraídos';
      case 'error': return 'Error al procesar';
    }
  }

  handleMicClick() {
    if (this.state === 'idle' || this.state === 'error' || this.state === 'success') {
      this.startRecording();
    } else if (this.state === 'recording') {
      this.stopRecording();
    }
  }

  async startRecording() {
    try {
      this.audioChunks = [];
      this.liveTranscription = '';
      this.interimText = '';
      this.extractedValues = {};
      this.extractedValuesList = [];
      this.state = 'idle'; // Reset first

      // 1. Pedir permisos de micrófono PRIMERO antes de cambiar estado
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Solo cambiar a 'recording' una vez que tengamos permisos
      this.state = 'recording';
      this.cdr.detectChanges();

      // 2. Setup Web Speech API para transcripción en tiempo real
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'es-ES';
        this.recognition.interimResults = true;
        this.recognition.continuous = true;
        this.recognition.maxAlternatives = 1;

        // Acumula texto final y muestra texto interino por separado
        this.recognition.onresult = (event: any) => {
          this.ngZone.run(() => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const t = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                this.liveTranscription += (this.liveTranscription ? ' ' : '') + t.trim();
              } else {
                interim += t;
              }
            }
            this.interimText = interim;
            this.cdr.detectChanges();
          });
        };

        this.recognition.onerror = (event: any) => {
          // Errores no fatales: 'no-speech', 'audio-capture' → ignorar
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          console.warn('SpeechRecognition error:', event.error);
        };

        // Si el reconocimiento termina inesperadamente mientras seguimos grabando, reiniciar
        this.recognition.onend = () => {
          if (this.state === 'recording') {
            try { this.recognition.start(); } catch (e) {}
          }
          this.cdr.detectChanges();
        };

        try {
          this.recognition.start();
        } catch (e) {
          console.warn('SpeechRecognition start error (ignorando):', e);
        }
      }

      // 3. Setup MediaRecorder con el stream ya obtenido
      let options: any = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        options = { mimeType: 'audio/ogg;codecs=opus' };
      }
      
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const mimeType = (options as any).mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.transcribeAndExtract(audioBlob);
        // Apagar micrófono físico
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop());
          this.mediaStream = null;
        }
      };

      this.mediaRecorder.start(250); // Chunk cada 250ms para tener datos seguros al final

    } catch (err: any) {
      console.error('Error starting recording:', err);
      this.state = 'error';
      this.liveTranscription = 'No se pudo acceder al micrófono. Asegúrate de dar los permisos necesarios.';
      this.cdr.detectChanges();
    }
  }

  stopRecording() {
    // Detener SpeechRecognition primero
    if (this.recognition) {
      // Desactivar el auto-restart antes de detener
      this.recognition.onend = null;
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }

    // Mover texto interino a texto final
    if (this.interimText.trim()) {
      this.liveTranscription += (this.liveTranscription ? ' ' : '') + this.interimText.trim();
      this.interimText = '';
    }

    // Detener MediaRecorder
    if (this.mediaRecorder) {
      this.state = 'transcribing';
      this.cdr.detectChanges();

      if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
        // Solicitar el último chunk y detener
        this.mediaRecorder.requestData();
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
          } else {
            // Si por algún motivo ya estaba inactivo, procesar lo que tengamos
            this.ngZone.run(() => {
              const mimeType = 'audio/webm';
              const audioBlob = new Blob(this.audioChunks, { type: mimeType });
              this.transcribeAndExtract(audioBlob);
            });
          }
        }, 300);
      } else {
        // Ya está inactivo, procesar directamente
        this.state = 'transcribing';
        this.cdr.detectChanges();
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.transcribeAndExtract(audioBlob);
      }
    }
  }

  transcribeAndExtract(audioBlob: Blob) {
    this.state = 'transcribing';
    
    // Limpiar timeout anterior si existe
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
    }

    // Timeout de seguridad: si en 30s no responde, mostrar error con el texto local
    this.processTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        if (this.state === 'transcribing') {
          console.error('Voice fill timeout: API tardó más de 30 segundos.');
          // Si tenemos transcripción local de Web Speech, usarla como fallback
          if (this.liveTranscription.trim()) {
            this.state = 'error';
            // Mostrar mensaje de timeout pero mantener transcripción local
          } else {
            this.state = 'error';
            this.liveTranscription = 'El procesamiento tardó demasiado. Intenta con un audio más corto o revisa tu conexión.';
          }
          this.cdr.detectChanges();
        }
      });
    }, 30000);

    const schema = this.fields.map(f => ({
      name: f.key,
      type: f.type,
      label: f.label,
      ...(f.options ? { options: f.options } : {})
    }));

    const formData = new FormData();
    formData.append('file', audioBlob, 'form_voice.webm');
    formData.append('fields', JSON.stringify(schema));

    // Llamada directa HTTP para mayor control y timeout explícito
    this.http.post<{ transcription: string, values: any }>(
      `${environment.aiServiceUrl}/forms/voice-fill`,
      formData
    ).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          clearTimeout(this.processTimeout);
          // Preferir transcripción del servidor (Whisper); si está vacía, usar la local de Web Speech
          if (res.transcription && res.transcription.trim()) {
            this.liveTranscription = res.transcription;
          }
          this.interimText = '';
          this.extractedValues = res.values;
          this.state = 'success';
          this.extractedValuesList = this.fields.map(f => ({
            key: f.key,
            label: f.label,
            value: this.extractedValues[f.key]
          }));
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          clearTimeout(this.processTimeout);
          console.error('STT/NLP Voice Fill extraction error:', err);
          this.state = 'error';
          // Mantener transcripción local de Web Speech como fallback
          if (!this.liveTranscription.trim()) {
            this.liveTranscription = 'Error al contactar el servicio de IA. Revisa que el servidor Python esté activo en el puerto 8000.';
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  retry() {
    this.cleanupAll();
    this.state = 'idle';
    this.liveTranscription = '';
    this.interimText = '';
    this.extractedValues = {};
    this.extractedValuesList = [];
    this.cdr.detectChanges();
    // Pequeña pausa antes de rearrancar para que el estado se limpie
    setTimeout(() => this.startRecording(), 200);
  }

  apply() {
    this.onApplied.emit(this.extractedValues);
    this.close();
  }

  close() {
    this.cleanupAll();
    this.state = 'idle';
    this.liveTranscription = '';
    this.interimText = '';
    this.extractedValues = {};
    this.extractedValuesList = [];
    this.cdr.detectChanges();
    this.onClose.emit();
  }

  private cleanupAll() {
    // Limpiar timeout
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
      this.processTimeout = null;
    }

    // Detener SpeechRecognition
    if (this.recognition) {
      this.recognition.onend = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }

    // Detener MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }
    this.mediaRecorder = null;

    // Apagar stream de micrófono
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.audioChunks = [];
  }

  ngOnDestroy() {
    this.cleanupAll();
  }
}

import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ActionButton, ChatMessageDto } from '../services/chatbot.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AiAssistantService } from '../services/ai-assistant.service';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  acciones?: ActionButton[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  isOpen = false;
  inputText = '';
  isTyping = false;
  contextoSeccion = 'GENERAL';

  messages: ChatMessage[] = [
    { text: '¡Hola! Soy BPM-Guía. ¿En qué te puedo ayudar hoy?', isBot: true, timestamp: new Date() }
  ];

  constructor(
    private chatbotService: ChatbotService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private aiSvc: AiAssistantService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateContext(event.urlAfterRedirects);
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.aiSvc.detenerHablar();
    }
    if (this.isOpen && this.messages.length === 1) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  getHistorial(): ChatMessageDto[] {
    // Tomamos los últimos 10 mensajes para dar contexto al bot
    // Filtramos mensajes vacíos o que solo tengan acciones
    return this.messages
      .filter(m => m.text && m.text.trim().length > 0)
      .slice(-10)
      .map(m => ({
        role: m.isBot ? 'assistant' : 'user',
        content: m.text
      }));
  }

  async sendMessage() {
    if (!this.inputText.trim()) return;

    const userText = this.inputText.trim();
    this.messages.push({ text: userText, isBot: false, timestamp: new Date() });
    
    // Obtenemos el historial ANTES de añadir el placeholder del bot
    const historial = this.getHistorial();
    
    this.inputText = '';
    this.isTyping = true;

    // Placeholder para el mensaje del bot que se irá llenando por streaming
    const botMessageIndex = this.messages.length;
    this.messages.push({ text: '', isBot: true, timestamp: new Date(), isStreaming: true });
    
    setTimeout(() => this.scrollToBottom(), 50);

    await this.chatbotService.consultarStream(
      userText,
      this.contextoSeccion,
      historial,
      (textChunk) => {
        // En cada chunk recibido
        this.ngZone.run(() => {
          this.isTyping = false;
          this.messages[botMessageIndex].text += textChunk;
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      },
      (data) => {
        // Al terminar el stream
        this.ngZone.run(() => {
          this.messages[botMessageIndex].isStreaming = false;
          
          if (data.fullText) {
             this.messages[botMessageIndex].text = data.fullText;
          }

          if (data.acciones && data.acciones.length > 0) {
            this.messages[botMessageIndex].acciones = data.acciones;
          }

          if (data.rutaNavegacion) {
            console.log('🚚 Chatbot: Navegando a:', data.rutaNavegacion);
            this.navigate(data.rutaNavegacion);
          }
          
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 50);
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.isTyping = false;
          this.messages[botMessageIndex].isStreaming = false;
          this.messages[botMessageIndex].text = 'Error al contactar al servidor. Intenta de nuevo.';
          this.cdr.detectChanges();
        });
      }
    );
  }

  executeAction(btn: ActionButton) {
    if (btn.ruta) {
      this.navigate(btn.ruta);
    }
  }

  private navigate(ruta: string) {
    if (ruta.includes('?')) {
      const [path, query] = ruta.split('?');
      const params: any = {};
      new URLSearchParams(query).forEach((v, k) => params[k] = v);
      this.router.navigate([path], { queryParams: params, queryParamsHandling: 'merge' });
    } else {
      this.router.navigateByUrl(ruta);
    }
  }

  private updateContext(url: string) {
    let baseContext = '';
    if (url.includes('designer')) baseContext = 'DISEÑADOR (Creación de Políticas y Diagramas)';
    else if (url.includes('funcionario')) baseContext = 'Bandeja de Funcionario (Ejecución de tareas)';
    else if (url.includes('admin')) baseContext = 'Panel de Administración (Roles, Usuarios, Tenant, Clientes, Analytics)';
    else baseContext = 'GENERAL';

    const userStr = localStorage.getItem('bpm_user');
    let userRole = 'DESCONOCIDO';
    if (userStr) {
      try {
        userRole = JSON.parse(userStr).rol || 'DESCONOCIDO';
      } catch(e) {}
    }
    
    this.contextoSeccion = `${baseContext} | Rol del Usuario Actual: ${userRole}`;
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    
    let html = text
      // Negritas: **texto** -> <b>texto</b>
      .replace(/\*\*(.*?)\*\*/g, '<b class="text-emerald-400 font-bold">$1</b>')
      // Listas: * item -> • item con margen
      .replace(/^\* (.*?)$/gm, '<div class="pl-2 my-1 flex gap-2"><span>•</span><span>$1</span></div>')
      // Saltos de línea
      .replace(/\n/g, '<br/>');
      
    return html;
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer && this.scrollContainer.nativeElement) {
         this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}

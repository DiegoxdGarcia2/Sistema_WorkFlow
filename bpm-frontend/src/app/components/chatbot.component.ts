import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../services/chatbot.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html'
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
    private cdr: ChangeDetectorRef
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
    if (this.isOpen && this.messages.length === 1) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage() {
    if (!this.inputText.trim()) return;

    const userText = this.inputText.trim();
    this.messages.push({ text: userText, isBot: false, timestamp: new Date() });
    this.inputText = '';
    this.isTyping = true;

    this.chatbotService.consultar(userText, this.contextoSeccion).subscribe({
      next: (res) => {
        console.log('✅ ChatbotService: Respuesta recibida', res);
        
        // Navegación automática si la IA lo indica
        if (res.rutaNavegacion) {
          console.log('🚚 Chatbot: Navegando a:', res.rutaNavegacion);
          
          if (res.rutaNavegacion.includes('?')) {
            const [path, query] = res.rutaNavegacion.split('?');
            const params: any = {};
            new URLSearchParams(query).forEach((v, k) => params[k] = v);
            this.router.navigate([path], { queryParams: params, queryParamsHandling: 'merge' });
          } else {
            this.router.navigateByUrl(res.rutaNavegacion);
          }
        }

        // Usamos setTimeout para evitar el error NG0100 de Angular
        setTimeout(() => {
          this.isTyping = false;
          // Pequeño formateador de Markdown para negritas y listas
          const formattedText = this.formatMarkdown(res.respuesta);
          
          this.messages.push({ text: formattedText, isBot: true, timestamp: new Date() });
          
          this.cdr.detectChanges();
          setTimeout(() => {
            this.scrollToBottom();
            this.cdr.detectChanges();
          }, 50);
        }, 100);
      },
      error: (e) => {
        console.error('❌ ChatbotService: ERROR', e);
        this.isTyping = false;
        this.messages.push({ text: 'Error al contactar al servidor. Intenta de nuevo.', isBot: true, timestamp: new Date() });
        this.cdr.detectChanges();
        setTimeout(() => {
          this.scrollToBottom();
          this.cdr.detectChanges();
        }, 50);
      }
    });
  }

  private updateContext(url: string) {
    if (url.includes('designer')) this.contextoSeccion = 'DISEÑADOR (Creación de Políticas y Diagramas)';
    else if (url.includes('funcionario')) this.contextoSeccion = 'Bandeja de Funcionario (Ejecución de tareas)';
    else if (url.includes('admin')) this.contextoSeccion = 'Panel de Administración (Roles, Usuarios, Tenant)';
    else this.contextoSeccion = 'GENERAL';
  }

  private formatMarkdown(text: string): string {
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
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}

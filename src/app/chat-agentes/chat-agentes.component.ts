import { Component, ElementRef, OnInit, ViewChild, AfterViewChecked, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../enviroment/enviroment.prd';
import { firstValueFrom } from 'rxjs';
import { AqbButtonComponent } from '../shared/ui/button/aqb-button.component';

interface AgentInfo {
  id: string;
  fileName: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

@Component({
  selector: 'app-chat-agentes',
  standalone: true,
  imports: [FormsModule, AqbButtonComponent],
  templateUrl: './chat-agentes.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-agentes.component.css'
})
export class ChatAgentesComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  agents: AgentInfo[] = [];
  selectedAgent = '';
  userInput = '';
  messages: ChatMessage[] = [];
  loading = false;
  sessionId = generateSessionId();
  agentsLoading = false;
  agentsMessage = '';
  private shouldScroll = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarAgentes();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  async carregarAgentes(): Promise<void> {
    this.agentsLoading = true;
    this.agentsMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<AgentInfo[]>(`${environment.apiUrl}/api/agents`)
      );
      this.agents = response || [];

      if (this.agents.length === 0) {
        this.agentsMessage = 'Nenhum agente disponivel no backend.';
      } else {
        this.selectedAgent = this.agents[0].id;
      }
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
      this.agentsMessage = 'Nao foi possivel carregar os agentes.';
      this.agents = [];
    } finally {
      this.agentsLoading = false;
    }
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || !this.selectedAgent || this.loading) return;

    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.loading = true;
    this.shouldScroll = true;

    this.http.post<any>(`${environment.apiUrl}/api/agents/sessions/chat`, {
      sessionId: this.sessionId,
      agentId: this.selectedAgent,
      message: text
    }).subscribe({
      next: (response) => {
        const last = response.messages[response.messages.length - 1];
        if (last?.role === 'assistant') {
          this.messages.push({ role: 'assistant', content: last.content });
        }
        this.loading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: '❌ Erro ao processar mensagem. Verifique a conexão e tente novamente.'
        });
        this.loading = false;
        this.shouldScroll = true;
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  newChat(): void {
    this.messages = [];
    this.sessionId = generateSessionId();
  }

  getAgentLabel(id: string): string {
    return id.replace(/_/g, ' ').replace(/-/g, ' ');
  }

  formatContent(content: string): string {
    return this.escapeHtml(content)
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="code-block">$2</code></pre>')
      .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/^- (.+)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Defesa em profundidade (Fase 14.6/Etapa 2): escapa HTML bruto ANTES de
   * aplicar as transformações markdown-like. O sanitizer automático do
   * [innerHTML] do Angular já bloqueava execução (nenhum
   * bypassSecurityTrustHtml é usado), mas sem este escaping HTML cru virava
   * markup real (ex.: <img onerror>). Delimitadores de markdown (`, *, -)
   * não são caracteres HTML especiais, então continuam intactos após o
   * escaping e as regras subsequentes seguem funcionando normalmente.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    } catch (_) {}
  }
}


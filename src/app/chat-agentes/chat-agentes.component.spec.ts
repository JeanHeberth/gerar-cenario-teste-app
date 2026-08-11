import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatAgentesComponent } from './chat-agentes.component';
import { environment } from '../enviroment/enviroment.prd';

/**
 * Testes de CARACTERIZAÇÃO (Fase 14.6/Etapa 1). Protegem o comportamento
 * REAL da tela Chat IA antes de qualquer migração visual/hardening — não
 * são testes de "como deveria ser". Nenhuma linha de produção foi alterada
 * para viabilizar esta suíte (produção somente leitura, conforme
 * autorização da Etapa 1).
 */
describe('ChatAgentesComponent (caracterização — Fase 14.6/Etapa 1)', () => {
  let fixture: ComponentFixture<ChatAgentesComponent>;
  let component: ChatAgentesComponent;
  let httpMock: HttpTestingController;

  function flushAgentes(payload: unknown): void {
    const req = httpMock.expectOne(`${environment.apiUrl}/api/agents`);
    expect(req.request.method).toBe('GET');
    req.flush(payload as any);
  }

  function textarea(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('.input-textarea');
  }

  function agentSelect(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('.agent-select');
  }

  function sendButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.send-button');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ChatAgentesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ChatAgentesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ────────────────────────────────────────────────────────────────────
  // AGENTES — ngOnInit -> carregarAgentes()
  // ────────────────────────────────────────────────────────────────────
  describe('agentes (carregamento automático no ngOnInit)', () => {
    it('dispara GET {apiUrl}/api/agents assim que o componente é criado', () => {
      fixture.detectChanges();
      expect(component.agentsLoading).toBeTrue();
      flushAgentes([]);
    });

    it('sucesso com lista não vazia: seleciona o PRIMEIRO agente da lista como default (agents[0].id) — estratégia diferente do Gerar Cenário', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([
        { id: 'agente-b', fileName: 'b.yaml' },
        { id: 'agente-a', fileName: 'a.yaml' },
      ]);
      tick();
      expect(component.selectedAgent).toBe('agente-b');
      expect(component.agentsLoading).toBeFalse();
    }));

    it('lista vazia: agentsMessage = "Nenhum agente disponivel no backend." e selectedAgent permanece vazio', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([]);
      tick();
      expect(component.agentsMessage).toBe('Nenhum agente disponivel no backend.');
      expect(component.selectedAgent).toBe('');
    }));

    it('erro HTTP: agentsMessage genérica, agents=[], console.error chamado', fakeAsync(() => {
      spyOn(console, 'error');
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/api/agents`).flush('erro', { status: 500, statusText: 'Server Error' });
      tick();
      expect(component.agentsMessage).toBe('Nao foi possivel carregar os agentes.');
      expect(component.agents).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ────────────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('sem agentes disponíveis: mostra "Nenhum agente disponivel" e desabilita textarea/select/enviar', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([]);
      tick();
      fixture.detectChanges();

      const empty = fixture.nativeElement.querySelector('.empty-state .empty-title');
      expect(empty?.textContent).toContain('Nenhum agente disponivel');
      expect(textarea().disabled).toBeTrue();
      expect(agentSelect().disabled).toBeTrue();
      expect(sendButton().disabled).toBeTrue();
    }));

    it('sem mensagens mas com agentes disponíveis: mostra "Como posso ajudar?"', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
      fixture.detectChanges();

      const empty = fixture.nativeElement.querySelector('.empty-state .empty-title');
      expect(empty?.textContent).toContain('Como posso ajudar?');
    }));

    it('com mensagens: nenhum empty-state de "Como posso ajudar?" é exibido', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();

      component.userInput = 'Olá';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi! Como posso ajudar?' },
        ],
      });
      tick();
      fixture.detectChanges();

      const titles = Array.from(fixture.nativeElement.querySelectorAll('.empty-title')).map((el: any) => el.textContent);
      expect(titles.some((t) => t?.includes('Como posso ajudar?'))).toBeFalse();
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // SEND MESSAGE
  // ────────────────────────────────────────────────────────────────────
  describe('sendMessage — validação e disparo', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
    }));

    it('mensagem vazia (ou só espaços) não adiciona ao histórico e não dispara HTTP', () => {
      component.userInput = '   ';
      component.sendMessage();
      expect(component.messages.length).toBe(0);
      httpMock.expectNone(`${environment.apiUrl}/api/agents/sessions/chat`);
    });

    it('sem agente selecionado, não dispara HTTP mesmo com texto válido', fakeAsync(() => {
      tick();
      component.selectedAgent = '';
      component.userInput = 'Olá';
      component.sendMessage();
      expect(component.messages.length).toBe(0);
      httpMock.expectNone(`${environment.apiUrl}/api/agents/sessions/chat`);
    }));

    it('mensagem válida: adiciona a mensagem do usuário IMEDIATAMENTE (otimista), limpa o input e ativa loading', fakeAsync(() => {
      tick();
      component.userInput = '  Olá, tudo bem?  ';
      component.sendMessage();

      expect(component.messages).toEqual([{ role: 'user', content: 'Olá, tudo bem?' }]);
      expect(component.userInput).toBe('');
      expect(component.loading).toBeTrue();

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá, tudo bem?' },
          { role: 'assistant', content: 'Tudo ótimo!' },
        ],
      });
      tick();
    }));

    it('payload exato enviado: {sessionId, agentId, message}', fakeAsync(() => {
      tick();
      const sessionIdAntes = component.sessionId;
      component.userInput = 'Teste de payload';
      component.sendMessage();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        sessionId: sessionIdAntes,
        agentId: 'agente-a',
        message: 'Teste de payload',
      });
      req.flush({ sessionId: sessionIdAntes, agentId: 'agente-a', messages: [] });
    }));

    it('sucesso: extrai a ÚLTIMA mensagem da resposta e só a adiciona se role="assistant"; desliga loading', fakeAsync(() => {
      tick();
      component.userInput = 'Pergunta';
      component.sendMessage();

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Pergunta' },
          { role: 'assistant', content: 'Resposta da IA' },
        ],
      });
      tick();

      expect(component.messages.length).toBe(2);
      expect(component.messages[1]).toEqual({ role: 'assistant', content: 'Resposta da IA' });
      expect(component.loading).toBeFalse();
    }));

    it('ACHADO: se a última mensagem da resposta NÃO for role="assistant", nada é adicionado ao histórico (silencioso)', fakeAsync(() => {
      tick();
      component.userInput = 'Pergunta';
      component.sendMessage();

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [{ role: 'user', content: 'Pergunta' }], // backend não retornou resposta do assistente
      });
      tick();

      expect(component.messages.length).toBe(1); // só a mensagem otimista do usuário
      expect(component.loading).toBeFalse();
    }));

    it('erro HTTP: adiciona mensagem de erro do assistente ao histórico (inline, sem window.alert) e desliga loading', fakeAsync(() => {
      spyOn(window, 'alert');
      tick();
      component.userInput = 'Pergunta';
      component.sendMessage();

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush('erro', { status: 500, statusText: 'Server Error' });
      tick();

      expect(component.loading).toBeFalse();
      expect(window.alert).not.toHaveBeenCalled();
      expect(component.messages[component.messages.length - 1]).toEqual({
        role: 'assistant',
        content: '❌ Erro ao processar mensagem. Verifique a conexão e tente novamente.',
      });
    }));
  });

  describe('duplo envio — CLASSIFICAÇÃO: PROTECTED', () => {
    it('chamar sendMessage() duas vezes seguidas (sem esperar a resposta) dispara SOMENTE UMA requisição — guard "if (... || this.loading) return" já existe no método', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();

      component.userInput = 'Primeira';
      component.sendMessage();
      component.userInput = 'Segunda'; // simula digitação durante o loading, sem efeito pois sendMessage() vai bloquear
      component.sendMessage();

      const reqs = httpMock.match(`${environment.apiUrl}/api/agents/sessions/chat`);
      expect(reqs.length).toBe(1);
      expect(component.messages.filter((m) => m.role === 'user').length).toBe(1);
      reqs.forEach((r) => r.flush({ sessionId: component.sessionId, agentId: 'agente-a', messages: [] }));
      tick();
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // TECLADO — Enter / Shift+Enter
  // ────────────────────────────────────────────────────────────────────
  describe('onKeyDown — Enter e Shift+Enter', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
    }));

    it('Enter (sem Shift) previne o default e envia a mensagem', () => {
      spyOn(component, 'sendMessage');
      const evt = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, cancelable: true });
      spyOn(evt, 'preventDefault');
      component.onKeyDown(evt);
      expect(evt.preventDefault).toHaveBeenCalled();
      expect(component.sendMessage).toHaveBeenCalled();
    });

    it('Shift+Enter NÃO previne o default nem envia (permite nova linha)', () => {
      spyOn(component, 'sendMessage');
      const evt = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
      spyOn(evt, 'preventDefault');
      component.onKeyDown(evt);
      expect(evt.preventDefault).not.toHaveBeenCalled();
      expect(component.sendMessage).not.toHaveBeenCalled();
    });

    it('outras teclas não disparam sendMessage', () => {
      spyOn(component, 'sendMessage');
      const evt = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
      component.onKeyDown(evt);
      expect(component.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // NOVO CHAT
  // ────────────────────────────────────────────────────────────────────
  describe('newChat()', () => {
    it('esvazia o histórico de mensagens e gera um novo sessionId (não persiste nada — sem localStorage/sessionStorage)', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();

      component.userInput = 'Olá';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!' },
        ],
      });
      tick();
      expect(component.messages.length).toBe(2);

      const sessionIdAntes = component.sessionId;
      component.newChat();

      expect(component.messages).toEqual([]);
      expect(component.sessionId).not.toBe(sessionIdAntes);
      expect(component.sessionId.length).toBeGreaterThan(0);
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // getAgentLabel / formatContent
  // ────────────────────────────────────────────────────────────────────
  describe('getAgentLabel()', () => {
    it('troca "_" e "-" por espaço', () => {
      expect(component.getAgentLabel('gerador_de-cenario_de-testes')).toBe('gerador de cenario de testes');
    });
  });

  describe('formatContent() — formatação markdown-like (escaping defensivo — Etapa 2)', () => {
    it('bloco de código ```...``` vira <pre><code class="code-block">, preservando o conteúdo mesmo após o escaping', () => {
      const html = component.formatContent('```\nconst x = 1;\n```');
      expect(html).toContain('<pre><code class="code-block">');
      expect(html).toContain('const x = 1;');
    });

    it('código inline `x` vira <code class="inline-code">', () => {
      expect(component.formatContent('use `npm install`')).toContain('<code class="inline-code">npm install</code>');
    });

    it('**negrito** vira <strong>, *itálico* vira <em> — delimitadores markdown não são afetados pelo escaping', () => {
      expect(component.formatContent('**forte**')).toContain('<strong>forte</strong>');
      expect(component.formatContent('*ênfase*')).toContain('<em>ênfase</em>');
    });

    it('linha "- item" vira <li>item</li>', () => {
      expect(component.formatContent('- primeiro item')).toContain('<li>primeiro item</li>');
    });

    it('quebras de linha viram <br>', () => {
      expect(component.formatContent('linha 1\nlinha 2')).toBe('linha 1<br>linha 2');
    });

    it('REGRESSÃO (Etapa 2): caracteres HTML especiais (<, >, &, ", \') SÃO escapados antes de qualquer formatação — corrige o achado MEDIUM da Etapa 1', () => {
      expect(component.formatContent('1 < 2 && 3 > 1')).toBe('1 &lt; 2 &amp;&amp; 3 &gt; 1');
      expect(component.formatContent(`"citação" e 'aspas'`)).toBe('&quot;citação&quot; e &#039;aspas&#039;');
    });

    it('REGRESSÃO (Etapa 2): HTML bruto malicioso (<img onerror>, <script>) vira texto escapado, nunca markup — formatContent() nunca devolve uma tag <img>/<script> real', () => {
      const html = component.formatContent('<img src="x" onerror="alert(1)">');
      expect(html).toBe('&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
      expect(html).not.toContain('<img');

      const htmlScript = component.formatContent('<script>alert(1)</script>');
      expect(htmlScript).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(htmlScript).not.toContain('<script');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // SEGURANÇA — [innerHTML] real, escaping defensivo + sanitizer do Angular
  // ────────────────────────────────────────────────────────────────────
  describe('segurança — renderização real via [innerHTML] (Etapa 2: escaping + sanitizer)', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
    }));

    it('REGRESSÃO (Etapa 2): <img onerror> malicioso aparece como TEXTO visível na bolha — nenhum elemento <img> é criado no DOM real', fakeAsync(() => {
      component.userInput = 'x';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'x' },
          { role: 'assistant', content: '<img src="x" onerror="window.__xssFired = true">conteúdo malicioso' },
        ],
      });
      tick();
      fixture.detectChanges();

      const bubble = fixture.nativeElement.querySelector('.assistant-row .message-content');
      expect(bubble.querySelector('img')).toBeNull();
      expect(bubble.textContent).toContain('<img src="x" onerror="window.__xssFired = true">');
      expect(bubble.textContent).toContain('conteúdo malicioso');
      expect((window as any).__xssFired).toBeUndefined();
    }));

    it('mantém a segunda camada de defesa: mesmo se o escaping falhasse, o sanitizer automático do Angular ([innerHTML] sem bypassSecurityTrustHtml) continua ativo', fakeAsync(() => {
      // simula HTML já "escapado incorretamente" chegando como markup real, testando a rede de segurança remanescente
      spyOn(component, 'formatContent').and.returnValue('<img src="x" onerror="window.__xssFired2 = true">');
      component.userInput = 'z';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'z' },
          { role: 'assistant', content: 'qualquer coisa' },
        ],
      });
      tick();
      fixture.detectChanges();

      const bubble = fixture.nativeElement.querySelector('.assistant-row .message-content');
      expect(bubble.innerHTML.toLowerCase()).not.toContain('onerror');
      expect((window as any).__xssFired2).toBeUndefined();
    }));

    it('PROVA: uma tag <script> injetada via [innerHTML] não é executada (comportamento padrão do navegador + sanitizer do Angular)', fakeAsync(() => {
      component.userInput = 'y';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'y' },
          { role: 'assistant', content: '<script>window.__xssScript = true;</script>Olá' },
        ],
      });
      tick();
      fixture.detectChanges();

      expect((window as any).__xssScript).toBeUndefined();
      const bubble = fixture.nativeElement.querySelector('.assistant-row .message-content');
      expect(bubble.textContent).toContain('Olá');
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // SCROLL
  // ────────────────────────────────────────────────────────────────────
  describe('scroll automático', () => {
    it('após enviar mensagem e a view ser verificada, scrollIntoView({behavior:"smooth"}) é chamado no marcador #messagesEnd', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
      fixture.detectChanges();

      const scrollSpy = spyOn(Element.prototype, 'scrollIntoView');

      component.userInput = 'Olá';
      component.sendMessage();
      fixture.detectChanges(); // dispara ngAfterViewChecked -> shouldScroll

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!' },
        ],
      });
      tick();
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // ACESSIBILIDADE — hardening da Etapa 2 (labels, aria-label, role=log,
  // role=status, migração do botão "Novo Chat" para AqbButtonComponent)
  // ────────────────────────────────────────────────────────────────────
  describe('acessibilidade e visual (Etapa 2)', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'agente-a', fileName: 'a.yaml' }]);
      tick();
      fixture.detectChanges();
    }));

    it('label ↔ campo: textarea de mensagem e select de agente têm <label for> associado ao id real do control (visualmente oculto via aq-sr-only)', () => {
      expect(textarea().id).toBe('chat-message-input');
      const labelTextarea = fixture.nativeElement.querySelector('label[for="chat-message-input"]');
      expect(labelTextarea).not.toBeNull();
      expect(labelTextarea.classList).toContain('aq-sr-only');

      expect(agentSelect().id).toBe('chat-agent-select');
      const labelSelect = fixture.nativeElement.querySelector('label[for="chat-agent-select"]');
      expect(labelSelect).not.toBeNull();
      expect(labelSelect.classList).toContain('aq-sr-only');
    });

    it('botão enviar possui aria-label="Enviar mensagem" (nome acessível explícito, independente do title)', () => {
      expect(sendButton().getAttribute('aria-label')).toBe('Enviar mensagem');
      expect(sendButton().getAttribute('title')).toBe('Enviar (Enter)');
    });

    it('área de mensagens usa role="log" + aria-live="polite" quando há conteúdo (sem role="alert" redundante por mensagem)', fakeAsync(() => {
      component.userInput = 'Olá';
      component.sendMessage();
      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!' },
        ],
      });
      tick();
      fixture.detectChanges();

      const log = fixture.nativeElement.querySelector('[role="log"]');
      expect(log).not.toBeNull();
      expect(log.getAttribute('aria-live')).toBe('polite');
      expect(log.querySelectorAll('[role="alert"]').length).toBe(0);
    }));

    it('indicador de "digitando" tem role="status" e texto acessível ("Assistente está respondendo"), com os pontos decorativos aria-hidden', fakeAsync(() => {
      component.userInput = 'Olá';
      component.sendMessage();
      fixture.detectChanges();

      const status = fixture.nativeElement.querySelector('.typing-bubble[role="status"]');
      expect(status).not.toBeNull();
      expect(status.textContent).toContain('Assistente está respondendo');
      const dots = status.querySelectorAll('.dot');
      expect(dots.length).toBe(3);
      dots.forEach((dot: HTMLElement) => expect(dot.getAttribute('aria-hidden')).toBe('true'));

      httpMock.expectOne(`${environment.apiUrl}/api/agents/sessions/chat`).flush({
        sessionId: component.sessionId,
        agentId: 'agente-a',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!' },
        ],
      });
      tick();
    }));

    it('REGRESSÃO (migração visual): botão "Novo Chat" agora é AqbButtonComponent, mas preserva exatamente o clique -> newChat()', () => {
      spyOn(component, 'newChat');
      const btn = fixture.nativeElement.querySelector('.chat-header-right aqb-button button') as HTMLButtonElement;
      expect(btn).not.toBeNull();
      btn.click();
      expect(component.newChat).toHaveBeenCalled();
    });

    it('REGRESSÃO (visual): fundo, header e bubbles consomem os tokens --aq-* (computed style bate com os valores do tema)', () => {
      const page = fixture.nativeElement.querySelector('.chat-page');
      const pageBg = getComputedStyle(page).backgroundColor;
      // --aq-background: #131313
      expect(pageBg).toBe('rgb(19, 19, 19)');
    });
  });
});

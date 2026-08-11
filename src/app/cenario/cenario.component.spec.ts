import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CenarioComponent } from './cenario.component';
import { environment } from '../enviroment/enviroment.prd';

/**
 * Testes de CARACTERIZAÇÃO (Fase 14.5/Etapa 1) + REGRESSÃO do hardening
 * (Fase 14.5/Etapa 2). Os testes marcados "REGRESSÃO (Etapa 2)" substituem
 * testes que antes documentavam um bug real (duplo submit sem guard, select
 * de agente não desabilitava de fato, window.alert() bloqueante) — agora
 * comprovam que o bug foi corrigido, sem remover a proteção original.
 */
describe('CenarioComponent (caracterização — Fase 14.5/Etapa 1 + Etapa 2)', () => {
  let fixture: ComponentFixture<CenarioComponent>;
  let component: CenarioComponent;
  let httpMock: HttpTestingController;
  let router: Router;

  const agentesFixture = (overrides: Partial<{ id: string; fileName: string }>[] = []) =>
    overrides.length > 0
      ? overrides
      : [
          { id: 'gerador-de-cenario-de-testes', fileName: 'gerador.yaml' },
          { id: 'outro-agente', fileName: 'outro.yaml' },
        ];

  function flushAgentes(payload: unknown): void {
    const req = httpMock.expectOne(`${environment.apiUrl}/api/agents`);
    expect(req.request.method).toBe('GET');
    req.flush(payload as any);
  }

  function flushAgentesError(): void {
    const req = httpMock.expectOne(`${environment.apiUrl}/api/agents`);
    req.flush('erro', { status: 500, statusText: 'Server Error' });
  }

  /** Os primitives Aqb* recebem a classe local no host (<aqb-button class="...">) — o <button> real fica dentro. */
  function button(hostSelector: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`${hostSelector} button`);
  }

  function tituloInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formcontrolname="titulo"]');
  }

  function regraTextarea(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea[formcontrolname="regraDeNegocio"]');
  }

  function agentSelect(): HTMLSelectElement {
    return fixture.nativeElement.querySelector('select[formcontrolname="agent"]');
  }

  function jiraTaskInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formcontrolname="jiraTaskKey"]');
  }

  function jiraBuscarBtn(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.cenario-page__jira-row .aqb-button--secondary');
  }

  function jiraBaixarBtn(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.cenario-page__jira-row .aqb-button--ghost');
  }

  function limparPdfsBtn(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.cenario-page__selected-files .aqb-button--danger');
  }

  function submitBtn(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.cenario-page__submit-row button[type="submit"]');
  }

  function fakeFile(name: string, type = 'application/pdf', content = 'conteudo'): File {
    return new File([content], name, { type });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CenarioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CenarioComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ────────────────────────────────────────────────────────────────────
  // FORM — controls, defaults, validators
  // ────────────────────────────────────────────────────────────────────
  describe('formulário — estrutura real', () => {
    it('possui exatamente os controls titulo, regraDeNegocio, jiraTaskKey e agent, todos string vazia por padrão', () => {
      expect(Object.keys(component.form.controls).sort()).toEqual(
        ['agent', 'jiraTaskKey', 'regraDeNegocio', 'titulo'].sort()
      );
      expect(component.form.get('titulo')?.value).toBe('');
      expect(component.form.get('regraDeNegocio')?.value).toBe('');
      expect(component.form.get('jiraTaskKey')?.value).toBe('');
      expect(component.form.get('agent')?.value).toBe('');
    });

    it('titulo e regraDeNegocio são required; jiraTaskKey e agent não possuem validators', () => {
      expect(component.form.get('titulo')?.hasValidator).toBeDefined();
      component.form.patchValue({ titulo: '', regraDeNegocio: '' });
      expect(component.form.get('titulo')?.invalid).toBeTrue();
      expect(component.form.get('regraDeNegocio')?.invalid).toBeTrue();
      expect(component.form.get('jiraTaskKey')?.invalid).toBeFalse();
      expect(component.form.get('agent')?.invalid).toBeFalse();
      expect(component.form.invalid).toBeTrue();

      component.form.patchValue({ titulo: 'Login', regraDeNegocio: 'Regra qualquer' });
      expect(component.form.valid).toBeTrue();
    });

    it('campoInvalido() só reporta erro depois de touched OU submitted (não antes)', () => {
      expect(component.campoInvalido('titulo')).toBeFalse();
      component.form.get('titulo')?.markAsTouched();
      expect(component.campoInvalido('titulo')).toBeTrue();
    });

    it('renderiza os 4 inputs reais do template ligados aos controls certos (formControlName)', () => {
      fixture.detectChanges();
      flushAgentes([]);
      expect(tituloInput()).not.toBeNull();
      expect(regraTextarea()).not.toBeNull();
      expect(agentSelect()).not.toBeNull();
      expect(jiraTaskInput()).not.toBeNull();
    });
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

    it('quando existe um agente cujo id contém "gerador" e "cenario", ele é selecionado como padrão automaticamente', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes(agentesFixture());
      tick();
      expect(component.form.get('agent')?.value).toBe('gerador-de-cenario-de-testes');
      expect(component.agentsLoading).toBeFalse();
    }));

    it('quando não há nenhum agente com esse padrão de id, o campo agent permanece vazio', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([{ id: 'outro-agente', fileName: 'outro.yaml' }]);
      tick();
      expect(component.form.get('agent')?.value).toBe('');
    }));

    it('lista vazia gera agentsMessage "Nenhum agente disponivel no backend."', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([]);
      tick();
      expect(component.agentsMessage).toBe('Nenhum agente disponivel no backend.');
      expect(component.agents).toEqual([]);
    }));

    it('erro HTTP gera agentsMessage "Nao foi possivel carregar os agentes.", zera agents e loga no console.error', fakeAsync(() => {
      spyOn(console, 'error');
      fixture.detectChanges();
      flushAgentesError();
      tick();
      expect(component.agentsMessage).toBe('Nao foi possivel carregar os agentes.');
      expect(component.agents).toEqual([]);
      expect(component.agentsLoading).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    }));

    it('REGRESSÃO (Etapa 2): o <select> de agente fica realmente disabled no DOM durante agentsLoading — corrigido via FormControl.disable() em vez do binding [disabled] conflitante com formControlName', () => {
      fixture.detectChanges();
      expect(component.agentsLoading).toBeTrue();
      expect(component.form.get('agent')?.disabled).toBeTrue();
      expect(agentSelect().disabled).toBeTrue();
      flushAgentes([]);
    });

    it('REGRESSÃO (Etapa 2): o <select> volta a ficar enabled assim que o carregamento termina', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([]);
      tick();
      expect(component.agentsLoading).toBeFalse();
      expect(component.form.get('agent')?.disabled).toBeFalse();
      fixture.detectChanges();
      expect(agentSelect().disabled).toBeFalse();
    }));

    it('REGRESSÃO (Etapa 2): o default do agente "gerador" continua sendo aplicado mesmo com o control temporariamente disabled durante o carregamento', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes(agentesFixture());
      tick();
      expect(component.form.get('agent')?.value).toBe('gerador-de-cenario-de-testes');
      expect(component.form.get('agent')?.disabled).toBeFalse();
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // SUBMIT — validação e disparo
  // ────────────────────────────────────────────────────────────────────
  describe('submit — validação', () => {
    it('gerar() com formulário inválido marca submitted=true e NÃO dispara nenhum HTTP de geração', () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.gerar();
      expect(component.submitted).toBeTrue();
      expect(component.loading).toBeFalse();
      httpMock.expectNone(`${environment.apiUrl}/cenario`);
      httpMock.expectNone(`${environment.apiUrl}/cenario/com-pdf`);
    });

    it('após submit inválido, os campos exibem a mensagem de erro (mesmo sem terem sido touched)', () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.gerar();
      fixture.detectChanges();
      expect(component.campoInvalido('titulo')).toBeTrue();
      expect(component.campoInvalido('regraDeNegocio')).toBeTrue();
      const erros = fixture.nativeElement.querySelectorAll('.cenario-page__helper--danger');
      expect(erros.length).toBeGreaterThanOrEqual(2);
    });

    it('botão de submit fica disabled enquanto o formulário é inválido', () => {
      fixture.detectChanges();
      flushAgentes([]);
      fixture.detectChanges();
      expect(submitBtn()!.disabled).toBeTrue();

      component.form.patchValue({ titulo: 'Login', regraDeNegocio: 'Regra' });
      fixture.detectChanges();
      expect(submitBtn()!.disabled).toBeFalse();
    });
  });

  describe('submit — geração SEM PDF (JSON)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ titulo: 'Login válido', regraDeNegocio: 'Usuário deve logar', agent: 'meu-agente' });
    });

    it('POST {apiUrl}/cenario com o payload exato {titulo, regraDeNegocio, agent} e loading=true durante a requisição', () => {
      component.gerar();
      expect(component.loading).toBeTrue();

      const req = httpMock.expectOne(`${environment.apiUrl}/cenario`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        titulo: 'Login válido',
        regraDeNegocio: 'Usuário deve logar',
        agent: 'meu-agente',
      });
      req.flush({ id: '1', titulo: 'Login válido', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
    });

    it('sucesso: mostra successMessage, reseta o form (mantendo o agente "gerador" se existir) e limpa loading/submitted', fakeAsync(() => {
      component.gerar();
      const req = httpMock.expectOne(`${environment.apiUrl}/cenario`);
      req.flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
      tick();

      expect(component.successMessage).toBe('✅ Cenario gerado com sucesso!');
      expect(component.loading).toBeFalse();
      expect(component.submitted).toBeFalse();
      expect(component.form.get('titulo')?.value).toBeFalsy();
      expect(component.arquivosPdfSelecionados).toEqual([]);

      tick(4000);
      expect(component.successMessage).toBe('');
    }));

    it('REGRESSÃO (Etapa 2): erro NÃO usa mais window.alert() — limpa loading, mostra erroGeracao inline (role="alert" no DOM) e loga console.error', fakeAsync(() => {
      spyOn(window, 'alert');
      spyOn(console, 'error');
      component.gerar();
      const req = httpMock.expectOne(`${environment.apiUrl}/cenario`);
      req.flush('erro', { status: 500, statusText: 'Server Error' });
      tick();
      fixture.detectChanges();

      expect(component.loading).toBeFalse();
      expect(window.alert).not.toHaveBeenCalled();
      expect(component.erroGeracao).toBe('❌ Erro ao gerar cenario.');
      expect(console.error).toHaveBeenCalled();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"].cenario-page__alert--danger');
      expect(alertEl?.textContent).toContain('❌ Erro ao gerar cenario.');
      // estado de sucesso/submitted não é tocado no fluxo de erro:
      expect(component.successMessage).toBe('');
    }));

    it('REGRESSÃO (Etapa 2): erroGeracao é limpo assim que uma nova geração válida é disparada', fakeAsync(() => {
      spyOn(console, 'error');
      component.gerar();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush('erro', { status: 500, statusText: 'Server Error' });
      tick();
      expect(component.erroGeracao).toBeTruthy();

      component.gerar();
      expect(component.erroGeracao).toBe('');

      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
      tick();
      tick(4000);
    }));
  });

  describe('submit — geração COM PDF (multipart)', () => {
    it('quando há PDFs selecionados, faz POST multipart em {apiUrl}/cenario/com-pdf com titulo/regraDeNegocio/agent/arquivos', () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ titulo: 'Com anexo', regraDeNegocio: 'Regra', agent: '' });
      component.selecionarPdf({ target: { files: [fakeFile('doc1.pdf')] } } as unknown as Event);

      component.gerar();

      const req = httpMock.expectOne(`${environment.apiUrl}/cenario/com-pdf`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      const body = req.request.body as FormData;
      expect(body.get('titulo')).toBe('Com anexo');
      expect(body.get('regraDeNegocio')).toBe('Regra');
      expect(body.get('agent')).toBeNull(); // agent vazio não é anexado ao FormData
      expect((body.getAll('arquivos') as File[]).length).toBe(1);

      req.flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
    });
  });

  describe('duplo submit', () => {
    it('REGRESSÃO (Etapa 2): chamar gerar() duas vezes seguidas (sem esperar a resposta) dispara SOMENTE UMA requisição HTTP — guard "if (this.loading) return" no início do método', () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ titulo: 'x', regraDeNegocio: 'y' });

      component.gerar();
      component.gerar();

      const reqs = httpMock.match(`${environment.apiUrl}/cenario`);
      expect(reqs.length).toBe(1);
      reqs.forEach((r) => r.flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] }));
    });

    it('REGRESSÃO (Etapa 2): após a resposta da primeira geração, uma nova chamada a gerar() volta a disparar HTTP normalmente (guard não trava permanentemente)', fakeAsync(() => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ titulo: 'x', regraDeNegocio: 'y' });

      component.gerar();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
      tick();
      tick(4000);

      component.form.patchValue({ titulo: 'x', regraDeNegocio: 'y' });
      component.gerar();
      const reqs = httpMock.match(`${environment.apiUrl}/cenario`);
      expect(reqs.length).toBe(1);
      reqs.forEach((r) => r.flush({ id: '2', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] }));
      tick();
      tick(4000);
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // JIRA
  // ────────────────────────────────────────────────────────────────────
  describe('Jira — buscar anexos da task', () => {
    it('sem taskKey preenchido, mostra mensagem info e NÃO dispara HTTP', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      await component.buscarArquivosDaTaskJira();
      expect(component.jiraMessage).toBe('Informe a task Jira no formato ABC-123.');
      expect(component.jiraMessageType).toBe('info');
      httpMock.expectNone(`${environment.apiUrl}/jira/tasks//attachments`);
    });

    it('normaliza a task key para maiúsculas e sem espaços antes de chamar a API', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: '  op-1122  ' });

      const promise = component.buscarArquivosDaTaskJira();
      const req = httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1122/attachments`);
      req.flush({ taskKey: 'OP-1122', attachments: [] });
      await promise;
    });

    it('quando a task não tem anexos, mostra mensagem info específica', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });
      const promise = component.buscarArquivosDaTaskJira();
      httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments`).flush({ taskKey: 'OP-1', attachments: [] });
      await promise;
      expect(component.jiraMessage).toBe('A task OP-1 nao possui anexos.');
      expect(component.jiraMessageType).toBe('info');
    });

    it('quando a task tem anexos mas nenhum é PDF, mostra mensagem info específica', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });
      const promise = component.buscarArquivosDaTaskJira();
      httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments`).flush({
        taskKey: 'OP-1',
        attachments: [{ id: 'a1', fileName: 'planilha.xlsx', mimeType: 'application/vnd.ms-excel', size: 10, downloadUrl: '/x' }],
      });
      await promise;
      expect(component.jiraMessage).toBe('A task OP-1 nao possui anexos PDF.');
    });

    it('filtra só os PDFs, baixa cada um via GET blob e adiciona à lista (com mensagem de sucesso)', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });

      const promise = component.buscarArquivosDaTaskJira();
      httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments`).flush({
        taskKey: 'OP-1',
        attachments: [
          { id: 'a1', fileName: 'doc.pdf', mimeType: 'application/pdf', size: 10, downloadUrl: '/jira/tasks/OP-1/attachments/a1/download' },
          { id: 'a2', fileName: 'planilha.xlsx', mimeType: 'application/vnd.ms-excel', size: 10, downloadUrl: '/x' },
        ],
      });
      // dá tempo ao microtask (Promise.all + map async) disparar o GET de download antes de esperá-lo:
      await Promise.resolve();
      await Promise.resolve();

      const downloadReq = httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments/a1/download`);
      downloadReq.flush(new Blob(['pdf'], { type: 'application/pdf' }));
      await promise;

      expect(component.arquivosPdfSelecionados.length).toBe(1);
      expect(component.arquivosPdfSelecionados[0].name).toBe('doc.pdf');
      expect(component.jiraMessage).toContain('1 PDF(s) importado(s) da task OP-1.');
      expect(component.jiraMessageType).toBe('success');
    });

    it('erro HTTP: mostra mensagem de erro e loga console.error', async () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });
      const promise = component.buscarArquivosDaTaskJira();
      httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments`).flush('erro', { status: 500, statusText: 'Server Error' });
      await promise;
      expect(component.jiraMessageType).toBe('error');
      expect(component.jiraMessage).toContain('Nao foi possivel buscar anexos');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Jira — baixar todos os anexos (.zip)', () => {
    it('sem taskKey, mostra mensagem info e não dispara HTTP', async () => {
      fixture.detectChanges();
      flushAgentes([]);
      await component.baixarTodosAnexosDaTaskJira();
      expect(component.jiraMessage).toBe('Informe a task Jira no formato ABC-123.');
    });

    it('sucesso: dispara download real (URL.createObjectURL) e mostra mensagem de sucesso com o nome do arquivo', async () => {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:fake');
      spyOn(window.URL, 'revokeObjectURL');
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });

      const promise = component.baixarTodosAnexosDaTaskJira();
      const req = httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments/download-all`);
      req.flush(new Blob(['zip'], { type: 'application/zip' }), {
        headers: { 'content-disposition': 'attachment; filename="OP-1.zip"' },
      });
      await promise;

      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(component.jiraMessage).toContain('OP-1.zip');
      expect(component.jiraMessageType).toBe('success');
    });

    it('erro HTTP: mostra mensagem de erro específica da task', async () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      flushAgentes([]);
      component.form.patchValue({ jiraTaskKey: 'OP-1' });
      const promise = component.baixarTodosAnexosDaTaskJira();
      // responseType 'blob' exige um corpo Blob no flush de erro (HttpTestingController não converte string automaticamente):
      httpMock.expectOne(`${environment.apiUrl}/jira/tasks/OP-1/attachments/download-all`)
        .flush(new Blob(['erro'], { type: 'text/plain' }), { status: 500, statusText: 'Server Error' });
      await promise;
      expect(component.jiraMessage).toBe('❌ Nao foi possivel baixar os anexos da task OP-1.');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // UPLOAD LOCAL / DRAG & DROP
  // ────────────────────────────────────────────────────────────────────
  describe('upload local de PDFs', () => {
    beforeEach(() => {
      fixture.detectChanges();
      flushAgentes([]);
    });

    it('selecionarPdf() com apenas PDFs adiciona todos e mostra mensagem de sucesso', () => {
      component.selecionarPdf({ target: { files: [fakeFile('a.pdf'), fakeFile('b.pdf')] } } as unknown as Event);
      expect(component.arquivosPdfSelecionados.length).toBe(2);
      expect(component.uploadMessageType).toBe('success');
    });

    it('mistura de PDF + não-PDF: adiciona só os PDFs e avisa que alguns foram ignorados', () => {
      component.selecionarPdf({
        target: { files: [fakeFile('a.pdf'), fakeFile('b.txt', 'text/plain')] },
      } as unknown as Event);
      expect(component.arquivosPdfSelecionados.length).toBe(1);
      expect(component.uploadMessage).toBe('Alguns arquivos foram ignorados. Apenas PDFs sao permitidos.');
      expect(component.uploadMessageType).toBe('info');
    });

    it('somente não-PDF: nada é adicionado e mensagem de erro é exibida', () => {
      component.selecionarPdf({ target: { files: [fakeFile('b.txt', 'text/plain')] } } as unknown as Event);
      expect(component.arquivosPdfSelecionados.length).toBe(0);
      expect(component.uploadMessage).toBe('Nenhum PDF valido foi selecionado.');
      expect(component.uploadMessageType).toBe('error');
    });

    it('arquivo duplicado (mesmo nome+tamanho+lastModified) não é adicionado de novo', () => {
      const arquivo = fakeFile('a.pdf');
      component.selecionarPdf({ target: { files: [arquivo] } } as unknown as Event);
      component.selecionarPdf({ target: { files: [arquivo] } } as unknown as Event);
      expect(component.arquivosPdfSelecionados.length).toBe(1);
      expect(component.uploadMessage).toBe('Os PDFs selecionados ja estavam na lista.');
      expect(component.uploadMessageType).toBe('info');
    });

    it('drag/drop: aoArrastarSobre ativa dragOver e previne o default; aoSairArrasto desativa', () => {
      const overEvt = jasmine.createSpyObj('DragEvent', ['preventDefault']);
      component.aoArrastarSobre(overEvt);
      expect(component.dragOver).toBeTrue();
      expect(overEvt.preventDefault).toHaveBeenCalled();

      const leaveEvt = jasmine.createSpyObj('DragEvent', ['preventDefault']);
      component.aoSairArrasto(leaveEvt);
      expect(component.dragOver).toBeFalse();
    });

    it('aoSoltarArquivos adiciona os arquivos soltos e desativa dragOver', () => {
      component.dragOver = true;
      const dropEvt = {
        preventDefault: jasmine.createSpy('preventDefault'),
        dataTransfer: { files: [fakeFile('solto.pdf')] },
      } as unknown as DragEvent;

      component.aoSoltarArquivos(dropEvt);

      expect(component.dragOver).toBeFalse();
      expect(component.arquivosPdfSelecionados.length).toBe(1);
      expect(component.arquivosPdfSelecionados[0].name).toBe('solto.pdf');
    });

    it('removerPdf(index) remove só o arquivo do índice informado', () => {
      component.selecionarPdf({ target: { files: [fakeFile('a.pdf'), fakeFile('b.pdf')] } } as unknown as Event);
      component.removerPdf(0);
      expect(component.arquivosPdfSelecionados.length).toBe(1);
      expect(component.arquivosPdfSelecionados[0].name).toBe('b.pdf');
    });

    it('limparPdfs() esvazia a lista e as mensagens de upload', () => {
      component.selecionarPdf({ target: { files: [fakeFile('a.pdf')] } } as unknown as Event);
      component.limparPdfs();
      expect(component.arquivosPdfSelecionados).toEqual([]);
      expect(component.uploadMessage).toBe('');
    });

    it('"Limpar PDFs" só aparece no DOM quando há arquivos selecionados', () => {
      expect(limparPdfsBtn()).toBeNull();
      component.selecionarPdf({ target: { files: [fakeFile('a.pdf')] } } as unknown as Event);
      fixture.detectChanges();
      expect(limparPdfsBtn()).not.toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // ACESSIBILIDADE — hardening da Etapa 2 (labels, aria-invalid,
  // aria-describedby, aria-busy, role=status)
  // ────────────────────────────────────────────────────────────────────
  describe('acessibilidade (Etapa 2)', () => {
    beforeEach(() => {
      fixture.detectChanges();
      flushAgentes([]);
      fixture.detectChanges();
    });

    it('label ↔ campo: Título, Regra de Negócio, Agente e Task Jira têm <label for> associado ao id real do control', () => {
      const casos: Array<[string, HTMLElement]> = [
        ['cenario-titulo', tituloInput()],
        ['cenario-regra-negocio', regraTextarea()],
        ['cenario-agent', agentSelect()],
        ['cenario-jira-task-key', jiraTaskInput()],
      ];

      for (const [id, campo] of casos) {
        expect(campo.id).toBe(id);
        const label = fixture.nativeElement.querySelector(`label[for="${id}"]`);
        expect(label).not.toBeNull();
      }
    });

    it('label ↔ campo: os dois inputs de upload (PDFs avulsos e pasta) também têm label associado', () => {
      const pdfInput = fixture.nativeElement.querySelector('input[type="file"]:not([webkitdirectory])') as HTMLInputElement;
      const pastaInput = fixture.nativeElement.querySelector('input[type="file"][webkitdirectory]') as HTMLInputElement;

      expect(pdfInput.id).toBe('cenario-upload-pdfs');
      expect(fixture.nativeElement.querySelector('label[for="cenario-upload-pdfs"]')).not.toBeNull();

      expect(pastaInput.id).toBe('cenario-upload-pasta');
      expect(fixture.nativeElement.querySelector('label[for="cenario-upload-pasta"]')).not.toBeNull();
    });

    it('aria-invalid e aria-describedby aparecem em Título/Regra de Negócio somente quando o campo está inválido e visível ao usuário', () => {
      expect(tituloInput().getAttribute('aria-invalid')).toBeNull();
      expect(tituloInput().getAttribute('aria-describedby')).toBeNull();

      component.gerar(); // submitted=true, form inválido -> não dispara HTTP
      fixture.detectChanges();

      expect(tituloInput().getAttribute('aria-invalid')).toBe('true');
      expect(tituloInput().getAttribute('aria-describedby')).toBe('cenario-titulo-erro');
      expect(fixture.nativeElement.querySelector('#cenario-titulo-erro')).not.toBeNull();

      expect(regraTextarea().getAttribute('aria-invalid')).toBe('true');
      expect(regraTextarea().getAttribute('aria-describedby')).toBe('cenario-regra-negocio-erro');
    });

    it('aria-busy do <form> reflete o estado de loading da geração', fakeAsync(() => {
      const form = fixture.nativeElement.querySelector('form');
      expect(form.getAttribute('aria-busy')).toBeNull();

      component.form.patchValue({ titulo: 'x', regraDeNegocio: 'y' });
      component.gerar();
      fixture.detectChanges();
      expect(form.getAttribute('aria-busy')).toBe('true');

      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
      tick();
      fixture.detectChanges();
      expect(form.getAttribute('aria-busy')).toBeNull();
      tick(4000);
    }));

    it('successMessage é anunciado via role="status" no DOM', fakeAsync(() => {
      component.form.patchValue({ titulo: 'x', regraDeNegocio: 'y' });
      component.gerar();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush({ id: '1', titulo: 'x', regraDeNegocio: 'x', criteriosAceitacao: '', cenarios: [] });
      tick();
      fixture.detectChanges();

      const status = fixture.nativeElement.querySelector('[role="status"]');
      expect(status?.textContent).toContain('Cenario gerado com sucesso');
      tick(4000);
    }));
  });

  // ────────────────────────────────────────────────────────────────────
  // NAVEGAÇÃO
  // ────────────────────────────────────────────────────────────────────
  describe('navegação', () => {
    it('"Visualizar Cenários" chama router.navigate(["/cenarios"])', () => {
      spyOn(router, 'navigate');
      fixture.detectChanges();
      flushAgentes([]);
      component.irParaCenarios();
      expect(router.navigate).toHaveBeenCalledWith(['/cenarios']);
    });

    it('botão real "Visualizar Cenários" no template dispara a navegação ao ser clicado', () => {
      spyOn(router, 'navigate');
      fixture.detectChanges();
      flushAgentes([]);
      fixture.detectChanges();
      button('.cenario-page__view-btn')!.click();
      expect(router.navigate).toHaveBeenCalledWith(['/cenarios']);
    });
  });
});

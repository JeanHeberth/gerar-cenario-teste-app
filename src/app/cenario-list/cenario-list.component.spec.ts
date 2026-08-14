import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import { CenarioListComponent } from './cenario-list.component';
import { environment } from '../enviroment/enviroment.prd';

/**
 * Testes de CARACTERIZAÇÃO (Fase 14.4). Criados na Etapa 1 como rede de
 * segurança; adaptados na Etapa 2 para a nova estrutura de DOM (primitives
 * Aqb*) SEM perder nenhuma cobertura de comportamento — só os seletores
 * mudaram, já que o objetivo da Etapa 2 é justamente trocar a camada
 * visual. Não é objetivo desta suíte cobrir exaustivamente as heurísticas
 * internas de formatação BDD (formatarBDD/extrairCampoTexto/etc.) — só o
 * comportamento observável.
 */
describe('CenarioListComponent (caracterização — Fase 14.4)', () => {
  let fixture: ComponentFixture<CenarioListComponent>;
  let httpMock: HttpTestingController;
  let router: Router;

  const cenarioFixture = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'cen-1',
    titulo: 'Login com credenciais válidas',
    regraDeNegocio: 'O usuário deve conseguir logar com email e senha válidos.',
    criteriosAceitacao: 'N/A',
    cenarios: [
      {
        nome: 'Login válido',
        objetivo: 'Validar login',
        precondicao: 'Usuário cadastrado',
        scriptTeste: 'Dado que o usuário está na tela de login\nQuando informa credenciais válidas',
        resultadoEsperado: 'Então o usuário é autenticado',
        variaveis: 'email; senha',
        componente: 'Login',
        rotulos: 'smoke',
        proposito: 'TESTE MANUAL',
        pasta: 'Login',
        proprietario: 'JIRAUSER23105',
        cobertura: 'Alta',
        status: 'APPROVED',
      },
    ],
    ...overrides,
  });

  function flushList(payload: unknown[]): void {
    const req = httpMock.expectOne(`${environment.apiUrl}/cenario`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);
    fixture.detectChanges();
  }

  /** Os primitives Aqb* recebem a classe local no host (<aqb-button class="...">) — o <button> real fica dentro. */
  function button(hostSelector: string): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector(`${hostSelector} button`);
  }

  function searchInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.cenario-list-page__search-input input');
  }

  function toggleButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.cenario-card__toggle');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CenarioListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(CenarioListComponent);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('carregamento inicial (LOADING)', () => {
    it('dispara GET {apiUrl}/cenario e mostra o skeleton (role="status") enquanto carregandoLista é true', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance.carregandoLista).toBeTrue();
      const status = fixture.nativeElement.querySelector('[role="status"]');
      expect(status).not.toBeNull();
      expect(status.querySelector('aqb-skeleton')).not.toBeNull();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush([]);
    });
  });

  describe('SUCCESS — lista com itens', () => {
    it('inverte a ordem da resposta (mais recente primeiro) e renderiza um card por cenário', () => {
      fixture.detectChanges();
      flushList([cenarioFixture({ id: 'a', titulo: 'Primeiro criado' }), cenarioFixture({ id: 'b', titulo: 'Segundo criado' })]);

      expect(fixture.componentInstance.carregandoLista).toBeFalse();
      const cards = fixture.nativeElement.querySelectorAll('.cenario-card');
      expect(cards.length).toBe(2);
      expect(cards[0].textContent).toContain('Segundo criado');
      expect(cards[1].textContent).toContain('Primeiro criado');
    });

    it('não mostra skeleton nem estado vazio quando há itens', () => {
      fixture.detectChanges();
      flushList([cenarioFixture()]);
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('.aqb-empty-state')).toBeNull();
    });
  });

  describe('EMPTY — lista vazia', () => {
    it('mostra "Nenhum cenário encontrado" quando a resposta é uma lista vazia', () => {
      fixture.detectChanges();
      flushList([]);
      const empty = fixture.nativeElement.querySelector('.cenario-list-page__empty');
      expect(empty?.textContent).toContain('Nenhum cenário encontrado');
      expect(fixture.nativeElement.querySelectorAll('.cenario-card').length).toBe(0);
    });
  });

  describe('ERROR — falha ao carregar', () => {
    it('mostra a mensagem de erro (em português correto) e não lança exceção quando o GET falha', () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      const req = httpMock.expectOne(`${environment.apiUrl}/cenario`);
      req.flush('erro', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(fixture.componentInstance.carregandoLista).toBeFalse();
      expect(fixture.componentInstance.erroCarregamento).toBe('Não foi possível carregar a lista de cenários.');
      const errorState = fixture.nativeElement.querySelector('.cenario-list-page__error');
      expect(errorState?.textContent).toContain('Falha ao carregar');
      expect(errorState?.textContent).toContain('Não foi possível carregar a lista de cenários.');
      expect(console.error).toHaveBeenCalled();
    });

    it('"Tentar novamente" refaz o GET, reativa o loading e, em caso de sucesso, mostra a lista', fakeAsync(() => {
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush('erro', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.cenario-list-page__error')).not.toBeNull();

      button('.cenario-list-page__retry-btn')!.click();
      fixture.detectChanges();

      // erro limpo e loading reativado imediatamente:
      expect(fixture.componentInstance.erroCarregamento).toBe('');
      expect(fixture.componentInstance.carregandoLista).toBeTrue();
      expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush([cenarioFixture()]);
      fixture.detectChanges();

      expect(fixture.componentInstance.carregandoLista).toBeFalse();
      expect(fixture.nativeElement.querySelector('.cenario-list-page__error')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.cenario-card').length).toBe(1);
    }));

    it('uma nova falha após "Tentar novamente" volta para o estado de erro', () => {
      fixture.detectChanges();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush('erro', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      button('.cenario-list-page__retry-btn')!.click();
      httpMock.expectOne(`${environment.apiUrl}/cenario`).flush('erro', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(fixture.componentInstance.erroCarregamento).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.cenario-list-page__error')).not.toBeNull();
    });
  });

  describe('busca por título', () => {
    it('input de busca possui label acessível ("Buscar cenário")', () => {
      fixture.detectChanges();
      flushList([cenarioFixture()]);
      const label = fixture.nativeElement.querySelector('.cenario-list-page__search-input label');
      expect(label?.textContent?.trim()).toBe('Buscar cenário');
      expect(label.getAttribute('for')).toBe(searchInput().id);
    });

    it('filtra por título de forma debounced (200ms), ignorando acentuação e caixa', fakeAsync(() => {
      fixture.detectChanges();
      flushList([cenarioFixture({ id: 'a', titulo: 'Autenticação de usuário' }), cenarioFixture({ id: 'b', titulo: 'Cadastro de produto' })]);

      searchInput().value = 'autenticacao';
      searchInput().dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // antes do debounce completar, a lista ainda não foi filtrada:
      tick(100);
      expect(fixture.componentInstance.cenariosFiltrados.length).toBe(2);

      tick(100);
      fixture.detectChanges();
      expect(fixture.componentInstance.cenariosFiltrados.length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('.cenario-card').length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Autenticação de usuário');
    }));

    it('mostra "Nenhum resultado para a busca" quando o termo não casa com nenhum título', fakeAsync(() => {
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Autenticação de usuário' })]);

      searchInput().value = 'termo-inexistente';
      searchInput().dispatchEvent(new Event('input'));
      tick(200);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.cenario-list-page__empty-filtered')?.textContent).toContain(
        'Nenhum resultado para a busca'
      );
    }));

    it('botão "Limpar" só aparece com texto digitado e restaura a lista completa ao ser clicado', fakeAsync(() => {
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Autenticação de usuário' })]);
      expect(button('.cenario-list-page__clear-btn')).toBeNull();

      searchInput().value = 'termo-inexistente';
      searchInput().dispatchEvent(new Event('input'));
      tick(200);
      fixture.detectChanges();
      expect(button('.cenario-list-page__clear-btn')).not.toBeNull();

      button('.cenario-list-page__clear-btn')!.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.termoBuscaDigitado).toBe('');
      expect(fixture.componentInstance.cenariosFiltrados.length).toBe(1);
    }));
  });

  describe('expandir/recolher detalhes — acessibilidade (Fase 14.4/Etapa 2)', () => {
    it('o controle de expansão é um <button> nativo com aria-expanded/aria-controls (corrige o HIGH da Etapa 1)', () => {
      fixture.detectChanges();
      flushList([cenarioFixture({ regraDeNegocio: 'Regra completa de negócio para o teste.' })]);

      const toggle = toggleButton();
      expect(toggle.tagName).toBe('BUTTON');
      expect(toggle.getAttribute('type')).toBe('button');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.hasAttribute('aria-controls')).toBeTrue();
    });

    it('mostra a regra de negócio completa só depois de clicar no controle de expansão, e recolhe ao clicar de novo — aria-expanded acompanha', () => {
      fixture.detectChanges();
      flushList([cenarioFixture({ regraDeNegocio: 'Regra completa de negócio para o teste.' })]);

      expect(fixture.nativeElement.querySelector('.cenario-card__details')).toBeNull();

      toggleButton().click();
      fixture.detectChanges();
      expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
      const details = fixture.nativeElement.querySelector('.cenario-card__details');
      expect(details?.textContent).toContain('Regra completa de negócio para o teste.');
      expect(details.id).toBe(toggleButton().getAttribute('aria-controls'));

      toggleButton().click();
      fixture.detectChanges();
      expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('.cenario-card__details')).toBeNull();
    });

    it('o botão de exportação não fica aninhado dentro do controle de expansão (evita button dentro de button)', () => {
      fixture.detectChanges();
      flushList([cenarioFixture()]);
      const toggle = toggleButton();
      expect(toggle.querySelector('button')).toBeNull();
    });

    it('FASE15-BUG-005B: exibe Status/Evidência/Fontes de cada cenário ao expandir os detalhes', () => {
      fixture.detectChanges();
      flushList([cenarioFixture({
        cenarios: [
          {
            nome: 'CEP com 7 dígitos deve ser inválido',
            status: 'APPROVED',
            evidenceType: 'DOCUMENTED',
            evidenceSources: 'RN-B-02',
          },
        ],
      })]);

      toggleButton().click();
      fixture.detectChanges();

      const detalhes = fixture.nativeElement.querySelector('.cenario-card__details');
      expect(detalhes.textContent).toContain('CEP com 7 dígitos deve ser inválido');
      expect(detalhes.textContent).toContain('Status: APPROVED');
      expect(detalhes.textContent).toContain('Evidência: DOCUMENTED');
      expect(detalhes.textContent).toContain('Fontes: RN-B-02');
    });

    it('FASE15-BUG-005B: cenário EXPLORATORY continua mostrando Status: REVIEW_REQUIRED na tela, com classe visual de alerta', () => {
      fixture.detectChanges();
      flushList([cenarioFixture({
        cenarios: [
          {
            nome: 'Campo CEP deve ser ocultado para clientes no exterior',
            status: 'REVIEW_REQUIRED',
            evidenceType: 'EXPLORATORY',
            evidenceSources: 'Não se aplica',
          },
        ],
      })]);

      toggleButton().click();
      fixture.detectChanges();

      const detalhes = fixture.nativeElement.querySelector('.cenario-card__details');
      expect(detalhes.textContent).toContain('Status: REVIEW_REQUIRED');
      expect(detalhes.textContent).toContain('Evidência: EXPLORATORY');
      expect(detalhes.querySelector('.cenario-card__status--review')).not.toBeNull();
    });

    it('cenário legado sem evidenceType (dado anterior ao BUG-005B) continua exibindo Status normalmente, sem quebrar', () => {
      fixture.detectChanges();
      flushList([cenarioFixture()]);

      toggleButton().click();
      fixture.detectChanges();

      const detalhes = fixture.nativeElement.querySelector('.cenario-card__details');
      expect(detalhes.textContent).toContain('Status: APPROVED');
      expect(detalhes.textContent).not.toContain('Evidência:');
    });
  });

  describe('navegação para criação', () => {
    it('"Novo Cenário" navega para a raiz ("/")', () => {
      spyOn(router, 'navigate');
      fixture.detectChanges();
      flushList([]);

      button('.cenario-list-page__create-btn')!.click();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('exportação (comportamento crítico)', () => {
    it('.xlsx: aciona FileSaver.saveAs com o nome de arquivo e mimetype esperados', () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Login válido' })]);

      button('.cenario-card__export-xlsx')!.click();

      expect(saveAsSpy).toHaveBeenCalledTimes(1);
      const [blob, filename] = saveAsSpy.calls.mostRecent().args;
      expect(filename).toBe('Login_vlido_ZephyrScale.xlsx');
      expect((blob as Blob).type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('.xlsx: mostra alert e NÃO exporta quando o cenário não possui itens', () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      const alertSpy = spyOn(window, 'alert');
      fixture.detectChanges();
      flushList([cenarioFixture({ cenarios: [] })]);

      button('.cenario-card__export-xlsx')!.click();

      expect(alertSpy).toHaveBeenCalledWith('Nenhum cenário encontrado para exportar.');
      expect(saveAsSpy).not.toHaveBeenCalled();
    });

    it('.doc: aciona FileSaver.saveAs com extensão .doc e mimetype de Word', () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Login válido' })]);

      button('.cenario-card__export-doc')!.click();

      expect(saveAsSpy).toHaveBeenCalledTimes(1);
      const [blob, filename] = saveAsSpy.calls.mostRecent().args;
      expect(filename).toBe('Login_vlido_ZephyrScale.doc');
      expect((blob as Blob).type).toBe('application/msword');
    });

    it('.pdf: não lança exceção ao exportar (o efeito real de download é coberto pelo E2E de caracterização)', () => {
      // jsPDF anexa .save() à instância dinamicamente (não existe em
      // jsPDF.prototype nem em jsPDF.API antes da instanciação), então não
      // há um ponto estável para spyOn sem acoplar o teste a detalhes
      // internos da biblioteca — a evidência de download real (nome do
      // arquivo, evento de download) fica a cargo do E2E desta fase.
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Login válido' })]);

      expect(() => button('.cenario-card__export-pdf')!.click()).not.toThrow();
    });

    it('Jira: o botão fica desabilitado (sem integração fictícia) e mostra a indicação "Indisponível"', () => {
      fixture.detectChanges();
      flushList([cenarioFixture()]);

      const jiraButton = button('.cenario-card__export-jira')!;
      expect(jiraButton.disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.cenario-card__jira')?.textContent).toContain('Indisponível');
    });
  });

  describe('FASE15-BUG-005B: rastreabilidade de evidência nas exportações', () => {
    it('.doc: inclui "Tipo de Evidência" e "Fontes" quando o cenário possui evidenceType/evidenceSources', async () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      fixture.detectChanges();
      flushList([cenarioFixture({
        titulo: 'Login válido',
        cenarios: [{
          nome: 'Login válido',
          objetivo: 'Validar login',
          scriptTeste: 'Dado...\nQuando...\nEntão...',
          resultadoEsperado: 'Login realizado',
          status: 'APPROVED',
          evidenceType: 'DOCUMENTED',
          evidenceSources: 'RN-A-01',
        }],
      })]);

      button('.cenario-card__export-doc')!.click();

      const [blob] = saveAsSpy.calls.mostRecent().args;
      const conteudo = await (blob as Blob).text();

      expect(conteudo).toContain('Tipo de Evidência');
      expect(conteudo).toContain('DOCUMENTED');
      expect(conteudo).toContain('Fontes');
      expect(conteudo).toContain('RN-A-01');
    });

    it('.doc: não inclui bloco de evidência quando o cenário não possui esses campos (retrocompatibilidade com dados legados)', async () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      fixture.detectChanges();
      flushList([cenarioFixture({ titulo: 'Login válido' })]);

      button('.cenario-card__export-doc')!.click();

      const [blob] = saveAsSpy.calls.mostRecent().args;
      const conteudo = await (blob as Blob).text();

      expect(conteudo).not.toContain('Tipo de Evidência');
    });

    it('.xlsx: inclui as colunas "Tipo de Evidência" e "Fontes" no cabeçalho, preservando as colunas existentes', async () => {
      const saveAsSpy = spyOn(FileSaver, 'saveAs');
      fixture.detectChanges();
      flushList([cenarioFixture({
        titulo: 'Login válido',
        cenarios: [{
          nome: 'Login válido',
          objetivo: 'Validar login',
          scriptTeste: 'Dado...\nQuando...\nEntão...',
          resultadoEsperado: 'Login realizado',
          status: 'APPROVED',
          evidenceType: 'DOCUMENTED',
          evidenceSources: 'RN-A-01',
        }],
      })]);

      button('.cenario-card__export-xlsx')!.click();

      const [blob] = saveAsSpy.calls.mostRecent().args;
      const buffer = await (blob as Blob).arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
      const cabecalho = linhas[0] as string[];

      expect(cabecalho).toContain('Tipo de Evidência');
      expect(cabecalho).toContain('Fontes');
      // colunas pré-existentes continuam presentes (não foram removidas/renomeadas)
      expect(cabecalho).toContain('Nome');
      expect(cabecalho).toContain('Status');

      const indiceEvidencia = cabecalho.indexOf('Tipo de Evidência');
      const indiceFontes = cabecalho.indexOf('Fontes');
      expect((linhas[1] as string[])[indiceEvidencia]).toBe('DOCUMENTED');
      expect((linhas[1] as string[])[indiceFontes]).toBe('RN-A-01');
    });
  });
});

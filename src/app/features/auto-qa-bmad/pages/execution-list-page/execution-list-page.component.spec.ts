import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ExecutionListPageComponent } from './execution-list-page.component';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionListPageComponent', () => {
  let fixture: ComponentFixture<ExecutionListPageComponent>;
  let router: Router;

  const listSignal = signal<AutoQaExecutionResponse[]>([]);
  const loadingSignal = signal(false);
  const creatingSignal = signal(false);
  const errorSignal = signal<string | null>(null);
  const paginationSignal = signal({ page: 0, size: 20, totalElements: 0 });
  const loadListSpy = jasmine.createSpy('loadList');
  const createExecutionSpy = jasmine.createSpy('createExecution');

  const fakeState = {
    list: listSignal,
    loading: loadingSignal,
    creating: creatingSignal,
    error: errorSignal,
    pagination: paginationSignal,
    hasExecutions: () => listSignal().length > 0,
    loadList: loadListSpy,
    createExecution: createExecutionSpy,
  };

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: 'DISCOVERY',
    lastStageStarted: 'DISCOVERY',
    lastStageCompleted: null,
    attempt: 0,
    progress: 10,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
    startedAt: '2026-08-06T10:00:00Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    listSignal.set([]);
    loadingSignal.set(false);
    creatingSignal.set(false);
    errorSignal.set(null);
    paginationSignal.set({ page: 0, size: 20, totalElements: 0 });
    loadListSpy.calls.reset();
    createExecutionSpy.calls.reset();

    TestBed.configureTestingModule({
      imports: [ExecutionListPageComponent],
      providers: [
        provideRouter([{ path: 'auto-qa/:executionId', children: [] }]),
        { provide: AutoQaExecutionStateService, useValue: fakeState },
      ],
    });
    fixture = TestBed.createComponent(ExecutionListPageComponent);
    router = TestBed.inject(Router);
  });

  it('carrega a primeira página de execuções ao iniciar', () => {
    fixture.detectChanges();
    expect(loadListSpy).toHaveBeenCalledWith(0, 20);
  });

  it('sempre renderiza o formulário de nova execução', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-new-execution-form')).not.toBeNull();
  });

  it('mostra indicador de carregamento quando loading() é verdadeiro', () => {
    loadingSignal.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('mostra estado vazio quando não está carregando e a lista está vazia', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-empty-state')).not.toBeNull();
  });

  it('mostra o erro em uma região role="alert" quando error() está definido', () => {
    errorSignal.set('Não foi possível carregar a lista de execuções.');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível carregar a lista de execuções.');
  });

  it('renderiza um app-execution-card por execução, dentro de um link para o detalhe', () => {
    listSignal.set([execution(), execution({ executionId: 'exec-2' })]);
    fixture.detectChanges();

    const links: HTMLAnchorElement[] = fixture.nativeElement.querySelectorAll('a.execution-list-page__item');
    expect(links.length).toBe(2);
    expect(links[0].querySelector('app-execution-card')).not.toBeNull();
  });

  it('ao criar com sucesso, chama createExecution e navega para o detalhe da execução criada', () => {
    const created = execution({ executionId: 'exec-novo' });
    createExecutionSpy.and.returnValue(of(created));
    spyOn(router, 'navigate');

    fixture.detectChanges();
    const form = fixture.debugElement.query((n) => n.name === 'app-new-execution-form');
    form.triggerEventHandler('created', { scenario: 'Cenário válido com texto suficiente', projectPath: '/tmp/x' });

    expect(createExecutionSpy).toHaveBeenCalledWith('Cenário válido com texto suficiente', '/tmp/x');
    expect(router.navigate).toHaveBeenCalledWith(['exec-novo'], jasmine.any(Object));
  });

  it('quando a criação falha, não navega', () => {
    createExecutionSpy.and.returnValue(throwError(() => new Error('falhou')));
    spyOn(router, 'navigate');

    fixture.detectChanges();
    const form = fixture.debugElement.query((n) => n.name === 'app-new-execution-form');
    form.triggerEventHandler('created', { scenario: 'Cenário válido com texto suficiente', projectPath: '/tmp/x' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('paginação', () => {
    it('desabilita "anterior" na primeira página e habilita "próxima" quando há mais itens', () => {
      listSignal.set([execution()]);
      paginationSignal.set({ page: 0, size: 1, totalElements: 2 });
      fixture.detectChanges();

      const prev: HTMLButtonElement = fixture.nativeElement.querySelector('.execution-list-page__prev button');
      const next: HTMLButtonElement = fixture.nativeElement.querySelector('.execution-list-page__next button');
      expect(prev.disabled).toBeTrue();
      expect(next.disabled).toBeFalse();
    });

    it('clicar em "próxima" chama loadList com a página seguinte', () => {
      listSignal.set([execution()]);
      paginationSignal.set({ page: 0, size: 1, totalElements: 2 });
      fixture.detectChanges();
      loadListSpy.calls.reset();

      fixture.nativeElement.querySelector('.execution-list-page__next button').click();

      expect(loadListSpy).toHaveBeenCalledWith(1, 1);
    });
  });
});

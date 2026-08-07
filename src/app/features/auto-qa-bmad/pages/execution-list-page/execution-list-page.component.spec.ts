import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ExecutionListPageComponent } from './execution-list-page.component';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionListPageComponent', () => {
  let fixture: ComponentFixture<ExecutionListPageComponent>;

  const listSignal = signal<AutoQaExecutionResponse[]>([]);
  const loadingSignal = signal(false);
  const errorSignal = signal<string | null>(null);
  const loadListSpy = jasmine.createSpy('loadList');

  const fakeState = {
    list: listSignal,
    loading: loadingSignal,
    error: errorSignal,
    loadList: loadListSpy,
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
    errorSignal.set(null);
    loadListSpy.calls.reset();

    TestBed.configureTestingModule({
      imports: [ExecutionListPageComponent],
      providers: [provideRouter([]), { provide: AutoQaExecutionStateService, useValue: fakeState }],
    });
    fixture = TestBed.createComponent(ExecutionListPageComponent);
  });

  it('carrega a primeira página de execuções ao iniciar', () => {
    fixture.detectChanges();
    expect(loadListSpy).toHaveBeenCalledWith(0, 20);
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

  it('lista uma execução por item quando list() não está vazia', () => {
    listSignal.set([execution(), execution({ executionId: 'exec-2', scenario: 'Cadastro de usuário' })]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.execution-list-page__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Login com credenciais válidas');
    expect(items[1].textContent).toContain('Cadastro de usuário');
  });
});

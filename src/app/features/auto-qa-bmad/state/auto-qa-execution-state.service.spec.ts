import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AutoQaExecutionStateService } from './auto-qa-execution-state.service';
import { AutoQaExecutionService } from '../services/auto-qa-execution.service';
import { AutoQaExecutionResponse } from '../models/auto-qa-execution.model';

describe('AutoQaExecutionStateService', () => {
  let state: AutoQaExecutionStateService;
  let serviceSpy: jasmine.SpyObj<AutoQaExecutionService>;

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'CREATED',
    currentStage: null,
    lastStageStarted: null,
    lastStageCompleted: null,
    attempt: 0,
    progress: 0,
    availableActions: ['START'],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('AutoQaExecutionService', ['list', 'get']);
    TestBed.configureTestingModule({
      providers: [AutoQaExecutionStateService, { provide: AutoQaExecutionService, useValue: serviceSpy }],
    });
    state = TestBed.inject(AutoQaExecutionStateService);
  });

  it('estado inicial: sem execução, lista vazia, sem erro, sem loading', () => {
    expect(state.current()).toBeNull();
    expect(state.list()).toEqual([]);
    expect(state.error()).toBeNull();
    expect(state.loading()).toBeFalse();
  });

  describe('loadList', () => {
    it('preenche list() com os itens retornados e limpa o erro', () => {
      const items = [execution()];
      serviceSpy.list.and.returnValue(of({ items, page: 0, size: 20, totalElements: 1 }));

      state.loadList(0, 20);

      expect(serviceSpy.list).toHaveBeenCalledWith(0, 20);
      expect(state.list()).toEqual(items);
      expect(state.error()).toBeNull();
      expect(state.loading()).toBeFalse();
    });

    it('ativa loading() durante a chamada', () => {
      let loadingDuringCall: boolean | undefined;
      serviceSpy.list.and.callFake(() => {
        loadingDuringCall = state.loading();
        return of({ items: [], page: 0, size: 20, totalElements: 0 });
      });

      state.loadList(0, 20);

      expect(loadingDuringCall).toBeTrue();
      expect(state.loading()).toBeFalse();
    });

    it('em erro, define error() e mantém list() vazia', () => {
      serviceSpy.list.and.returnValue(throwError(() => new Error('falha de rede')));

      state.loadList(0, 20);

      expect(state.list()).toEqual([]);
      expect(state.error()).toBeTruthy();
      expect(state.loading()).toBeFalse();
    });
  });

  describe('loadExecution', () => {
    it('preenche current() com a execução retornada', () => {
      const exec = execution({ status: 'RUNNING', currentStage: 'DISCOVERY' });
      serviceSpy.get.and.returnValue(of(exec));

      state.loadExecution('exec-1');

      expect(serviceSpy.get).toHaveBeenCalledWith('exec-1');
      expect(state.current()).toEqual(exec);
      expect(state.error()).toBeNull();
    });

    it('em erro, define error() e não corrompe current() (mantém o último valor válido)', () => {
      const exec = execution();
      serviceSpy.get.and.returnValue(of(exec));
      state.loadExecution('exec-1');
      expect(state.current()).toEqual(exec);

      serviceSpy.get.and.returnValue(throwError(() => new Error('não encontrada')));
      state.loadExecution('exec-1');

      expect(state.current()).toEqual(exec);
      expect(state.error()).toBeTruthy();
    });
  });

  describe('isTerminal (computed)', () => {
    it('é falso quando não há execução carregada', () => {
      expect(state.isTerminal()).toBeFalse();
    });

    it('é falso para status não terminal (ex.: RUNNING)', () => {
      serviceSpy.get.and.returnValue(of(execution({ status: 'RUNNING' })));
      state.loadExecution('exec-1');
      expect(state.isTerminal()).toBeFalse();
    });

    it('é verdadeiro para COMPLETED, FAILED e CANCELLED', () => {
      for (const status of ['COMPLETED', 'FAILED', 'CANCELLED'] as const) {
        serviceSpy.get.and.returnValue(of(execution({ status })));
        state.loadExecution('exec-1');
        expect(state.isTerminal()).toBeTrue();
      }
    });
  });
});

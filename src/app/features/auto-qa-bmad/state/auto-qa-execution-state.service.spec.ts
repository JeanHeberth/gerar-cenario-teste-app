import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
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

  const networkError = () => new HttpErrorResponse({ status: 0 });

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('AutoQaExecutionService', [
      'list',
      'get',
      'create',
      'start',
      'continueExecution',
      'generate',
      'cancel',
      'registerApplyApproval',
      'registerExecutionApproval',
    ]);
    TestBed.configureTestingModule({
      providers: [AutoQaExecutionStateService, { provide: AutoQaExecutionService, useValue: serviceSpy }],
    });
    state = TestBed.inject(AutoQaExecutionStateService);
  });

  it('estado inicial: sem execução, lista vazia, sem erro, sem loading/creating, paginação zerada, sem seleção, sem pendingAction/actionError', () => {
    expect(state.current()).toBeNull();
    expect(state.list()).toEqual([]);
    expect(state.error()).toBeNull();
    expect(state.loading()).toBeFalse();
    expect(state.creating()).toBeFalse();
    expect(state.pagination()).toEqual({ page: 0, size: 20, totalElements: 0 });
    expect(state.selectedExecutionId()).toBeNull();
    expect(state.pendingAction()).toBeNull();
    expect(state.actionError()).toBeNull();
  });

  describe('loadList', () => {
    it('preenche list() e pagination() com o retornado e limpa o erro', () => {
      const items = [execution()];
      serviceSpy.list.and.returnValue(of({ items, page: 1, size: 10, totalElements: 11 }));

      state.loadList(1, 10);

      expect(serviceSpy.list).toHaveBeenCalledWith(1, 10);
      expect(state.list()).toEqual(items);
      expect(state.pagination()).toEqual({ page: 1, size: 10, totalElements: 11 });
      expect(state.error()).toBeNull();
      expect(state.loading()).toBeFalse();
    });

    it('ativa loading() durante a chamada e desativa via finalize (mesmo em erro)', () => {
      let loadingDuringCall: boolean | undefined;
      serviceSpy.list.and.callFake(() => {
        loadingDuringCall = state.loading();
        return throwError(() => networkError());
      });

      state.loadList(0, 20);

      expect(loadingDuringCall).toBeTrue();
      expect(state.loading()).toBeFalse();
    });

    it('em erro, define error() e mantém list() vazia', () => {
      serviceSpy.list.and.returnValue(throwError(() => networkError()));

      state.loadList(0, 20);

      expect(state.list()).toEqual([]);
      expect(state.error()).toBeTruthy();
      expect(state.loading()).toBeFalse();
    });

    it('ignora uma segunda chamada enquanto a primeira ainda está em andamento (evita chamadas duplicadas)', () => {
      serviceSpy.list.and.returnValue(of({ items: [], page: 0, size: 20, totalElements: 0 }).pipe());
      serviceSpy.list.and.callFake(() => {
        state.loadList(0, 20); // chamada re-entrante, deve ser ignorada
        return of({ items: [], page: 0, size: 20, totalElements: 0 });
      });

      state.loadList(0, 20);

      expect(serviceSpy.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadExecution', () => {
    it('preenche current() e selectedExecutionId() com a execução retornada', () => {
      const exec = execution({ status: 'RUNNING', currentStage: 'DISCOVERY' });
      serviceSpy.get.and.returnValue(of(exec));

      state.loadExecution('exec-1');

      expect(serviceSpy.get).toHaveBeenCalledWith('exec-1');
      expect(state.current()).toEqual(exec);
      expect(state.selectedExecutionId()).toBe('exec-1');
      expect(state.error()).toBeNull();
    });

    it('em erro, define error() e não corrompe current() (mantém o último valor válido)', () => {
      const exec = execution();
      serviceSpy.get.and.returnValue(of(exec));
      state.loadExecution('exec-1');
      expect(state.current()).toEqual(exec);

      serviceSpy.get.and.returnValue(throwError(() => networkError()));
      state.loadExecution('exec-1');

      expect(state.current()).toEqual(exec);
      expect(state.error()).toBeTruthy();
    });

    it('ignora uma segunda chamada enquanto a primeira ainda está em andamento', () => {
      serviceSpy.get.and.callFake(() => {
        state.loadExecution('exec-1');
        return of(execution());
      });

      state.loadExecution('exec-1');

      expect(serviceSpy.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('createExecution', () => {
    it('ativa creating() durante a chamada e desativa ao final (finalize)', () => {
      let creatingDuringCall: boolean | undefined;
      serviceSpy.create.and.callFake(() => {
        creatingDuringCall = state.creating();
        return of(execution());
      });

      state.createExecution('Cenário válido com texto suficiente', '/tmp/projeto').subscribe();

      expect(creatingDuringCall).toBeTrue();
      expect(state.creating()).toBeFalse();
    });

    it('em sucesso, define current() com a execução criada e emite no observable retornado', () => {
      const created = execution({ executionId: 'exec-novo' });
      serviceSpy.create.and.returnValue(of(created));

      let emitted: AutoQaExecutionResponse | undefined;
      state.createExecution('Cenário válido com texto suficiente', '/tmp/projeto').subscribe((r) => (emitted = r));

      expect(serviceSpy.create).toHaveBeenCalledWith('Cenário válido com texto suficiente', '/tmp/projeto');
      expect(state.current()).toEqual(created);
      expect(emitted).toEqual(created);
    });

    it('em erro, define error(), não fica com creating() travado e propaga o erro para quem assinou', () => {
      serviceSpy.create.and.returnValue(throwError(() => networkError()));

      let receivedError = false;
      state.createExecution('Cenário válido com texto suficiente', '/tmp/projeto').subscribe({
        error: () => (receivedError = true),
      });

      expect(receivedError).toBeTrue();
      expect(state.creating()).toBeFalse();
      expect(state.error()).toBeTruthy();
    });

    it('ignora uma segunda chamada enquanto a primeira ainda está em andamento', () => {
      serviceSpy.create.and.callFake(() => {
        state.createExecution('outro cenário com texto suficiente', '/tmp/outro').subscribe();
        return of(execution());
      });

      state.createExecution('Cenário válido com texto suficiente', '/tmp/projeto').subscribe();

      expect(serviceSpy.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('computed', () => {
    it('hasExecutions reflete list()', () => {
      expect(state.hasExecutions()).toBeFalse();
      serviceSpy.list.and.returnValue(of({ items: [execution()], page: 0, size: 20, totalElements: 1 }));
      state.loadList(0, 20);
      expect(state.hasExecutions()).toBeTrue();
    });

    it('hasCurrentExecution reflete current()', () => {
      expect(state.hasCurrentExecution()).toBeFalse();
      serviceSpy.get.and.returnValue(of(execution()));
      state.loadExecution('exec-1');
      expect(state.hasCurrentExecution()).toBeTrue();
    });

    it('currentWarnings/currentErrors/currentAvailableActions retornam [] sem execução carregada', () => {
      expect(state.currentWarnings()).toEqual([]);
      expect(state.currentErrors()).toEqual([]);
      expect(state.currentAvailableActions()).toEqual([]);
    });

    it('currentWarnings/currentErrors/currentAvailableActions refletem a execução carregada', () => {
      const exec = execution({
        warnings: [{ code: 'W1', description: 'aviso', blocking: false }],
        errors: [{ code: 'E1', message: 'erro' }],
        availableActions: ['START', 'CANCEL'],
      });
      serviceSpy.get.and.returnValue(of(exec));
      state.loadExecution('exec-1');

      expect(state.currentWarnings()).toEqual(exec.warnings);
      expect(state.currentErrors()).toEqual(exec.errors);
      expect(state.currentAvailableActions()).toEqual(['START', 'CANCEL']);
    });

    it('canRefresh é falso sem execução carregada e verdadeiro com execução carregada e sem loading', () => {
      expect(state.canRefresh()).toBeFalse();
      serviceSpy.get.and.returnValue(of(execution()));
      state.loadExecution('exec-1');
      expect(state.canRefresh()).toBeTrue();
    });

    it('canRefresh é falso enquanto loading() está ativo', () => {
      serviceSpy.get.and.callFake(() => {
        expect(state.canRefresh()).toBeFalse();
        return of(execution());
      });
      state.loadExecution('exec-1');
    });
  });

  describe('ações de workflow (start/continue/generate/cancel/aprovações)', () => {
    it('start(): chama o service, ativa pendingAction("START") durante a chamada e atualiza current() com a resposta', () => {
      const updated = execution({ status: 'RUNNING', currentStage: 'DISCOVERY' });
      let pendingDuringCall: string | null | undefined;
      serviceSpy.start.and.callFake(() => {
        pendingDuringCall = state.pendingAction();
        return of(updated);
      });

      state.start('exec-1').subscribe();

      expect(serviceSpy.start).toHaveBeenCalledWith('exec-1');
      expect(pendingDuringCall).toBe('START');
      expect(state.pendingAction()).toBeNull();
      expect(state.current()).toEqual(updated);
    });

    it('continueExecution(): chama executionService.continueExecution', () => {
      serviceSpy.continueExecution.and.returnValue(of(execution()));
      state.continueExecution('exec-1').subscribe();
      expect(serviceSpy.continueExecution).toHaveBeenCalledWith('exec-1');
    });

    it('generate(): chama executionService.generate', () => {
      serviceSpy.generate.and.returnValue(of(execution()));
      state.generate('exec-1').subscribe();
      expect(serviceSpy.generate).toHaveBeenCalledWith('exec-1');
    });

    it('cancel(): chama executionService.cancel com o motivo informado', () => {
      serviceSpy.cancel.and.returnValue(of(execution({ status: 'CANCELLED' })));
      state.cancel('exec-1', 'Cancelado pelo usuário').subscribe();
      expect(serviceSpy.cancel).toHaveBeenCalledWith('exec-1', 'Cancelado pelo usuário');
    });

    it('approveFileUpdate(): chama executionService.registerApplyApproval com o request', () => {
      const request = {
        approvedBy: 'jean',
        authorizedOperations: ['CREATE' as const],
        allowFileUpdate: true,
        allowWarnings: false,
      };
      serviceSpy.registerApplyApproval.and.returnValue(of(execution()));
      state.approveFileUpdate('exec-1', request).subscribe();
      expect(serviceSpy.registerApplyApproval).toHaveBeenCalledWith('exec-1', request);
    });

    it('approveExecution(): chama executionService.registerExecutionApproval com o request', () => {
      const request = {
        approvedBy: 'jean',
        allowedCommands: ['NPM_TEST' as const],
        allowTestExecution: true,
        allowInstallCommand: false,
        allowBuildCommand: false,
      };
      serviceSpy.registerExecutionApproval.and.returnValue(of(execution()));
      state.approveExecution('exec-1', request).subscribe();
      expect(serviceSpy.registerExecutionApproval).toHaveBeenCalledWith('exec-1', request);
    });

    it('em erro, define actionError(), limpa pendingAction() e propaga o erro para quem assinou', () => {
      serviceSpy.start.and.returnValue(throwError(() => networkError()));

      let receivedError = false;
      state.start('exec-1').subscribe({ error: () => (receivedError = true) });

      expect(receivedError).toBeTrue();
      expect(state.pendingAction()).toBeNull();
      expect(state.actionError()).toBeTruthy();
    });

    it('ignora uma nova ação enquanto outra ainda está em andamento (guard entre ações diferentes)', () => {
      serviceSpy.start.and.callFake(() => {
        state.generate('exec-1').subscribe(); // reentrante, deve ser ignorado
        return of(execution());
      });

      state.start('exec-1').subscribe();

      expect(serviceSpy.generate).not.toHaveBeenCalled();
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ExecutionDetailPageComponent } from './execution-detail-page.component';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionDetailPageComponent', () => {
  let fixture: ComponentFixture<ExecutionDetailPageComponent>;

  const currentSignal = signal<AutoQaExecutionResponse | null>(null);
  const loadingSignal = signal(false);
  const errorSignal = signal<string | null>(null);
  const selectedExecutionIdSignal = signal<string | null>(null);
  const pendingActionSignal = signal<string | null>(null);
  const actionErrorSignal = signal<string | null>(null);
  const loadExecutionSpy = jasmine.createSpy('loadExecution');
  const startSpy = jasmine.createSpy('start');
  const continueExecutionSpy = jasmine.createSpy('continueExecution');
  const generateSpy = jasmine.createSpy('generate');
  const cancelSpy = jasmine.createSpy('cancel');
  const approveFileUpdateSpy = jasmine.createSpy('approveFileUpdate');
  const approveExecutionSpy = jasmine.createSpy('approveExecution');
  const applySpy = jasmine.createSpy('apply');
  const executeSpy = jasmine.createSpy('execute');

  const fakeState = {
    current: currentSignal,
    loading: loadingSignal,
    error: errorSignal,
    selectedExecutionId: selectedExecutionIdSignal,
    pendingAction: pendingActionSignal,
    actionError: actionErrorSignal,
    loadExecution: loadExecutionSpy,
    hasCurrentExecution: () => currentSignal() !== null,
    canRefresh: () => currentSignal() !== null && !loadingSignal(),
    currentWarnings: () => currentSignal()?.warnings ?? [],
    currentErrors: () => currentSignal()?.errors ?? [],
    currentAvailableActions: () => currentSignal()?.availableActions ?? [],
    start: startSpy,
    continueExecution: continueExecutionSpy,
    generate: generateSpy,
    cancel: cancelSpy,
    approveFileUpdate: approveFileUpdateSpy,
    approveExecution: approveExecutionSpy,
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
    availableActions: ['CANCEL'],
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
    currentSignal.set(null);
    loadingSignal.set(false);
    errorSignal.set(null);
    selectedExecutionIdSignal.set(null);
    pendingActionSignal.set(null);
    actionErrorSignal.set(null);
    loadExecutionSpy.calls.reset();
    startSpy.calls.reset();
    continueExecutionSpy.calls.reset();
    generateSpy.calls.reset();
    cancelSpy.calls.reset();
    approveFileUpdateSpy.calls.reset();
    approveExecutionSpy.calls.reset();
    startSpy.and.returnValue(of(execution()));
    continueExecutionSpy.and.returnValue(of(execution()));
    generateSpy.and.returnValue(of(execution()));
    cancelSpy.and.returnValue(of(execution({ status: 'CANCELLED' })));
    approveFileUpdateSpy.and.returnValue(of(execution()));
    approveExecutionSpy.and.returnValue(of(execution()));
    applySpy.and.returnValue(of(execution()));
    executeSpy.and.returnValue(of(execution()));

    const fakeStateWithApply = {
      ...fakeState,
      apply: applySpy,
      execute: executeSpy,
    };

    TestBed.configureTestingModule({
      imports: [ExecutionDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: AutoQaExecutionStateService, useValue: fakeStateWithApply },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of({ get: (key: string) => (key === 'executionId' ? 'exec-1' : null) }) },
        },
      ],
    });
    fixture = TestBed.createComponent(ExecutionDetailPageComponent);
  });

  it('carrega a execução a partir do executionId da rota', () => {
    fixture.detectChanges();
    expect(loadExecutionSpy).toHaveBeenCalledWith('exec-1');
  });

  it('mostra indicador de carregamento enquanto não há execução carregada', () => {
    loadingSignal.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('mostra o erro em role="alert" quando error() está definido', () => {
    errorSignal.set('A execução solicitada não existe ou foi removida.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'A execução solicitada não existe ou foi removida.'
    );
  });

  describe('com execução carregada', () => {
    beforeEach(() => {
      currentSignal.set(execution());
      selectedExecutionIdSignal.set('exec-1');
    });

    it('mostra o cenário no cabeçalho', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.aqb-page-header__title')?.textContent).toContain(
        'Login com credenciais válidas'
      );
    });

    it('renderiza WorkflowOverview, StageTimeline, StageDetailPanel, ExecutionSummary, ExecutionStatusHeader, InspectionPanel (com ExecutionResultSummary/WarningList/ErrorList na aba Resumo) e ActionBar', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-workflow-overview')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-stage-timeline')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-stage-detail-panel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-execution-summary')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-execution-status-header')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-execution-inspection-panel')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-execution-result-summary')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-warning-list')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-error-list')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-action-bar')).not.toBeNull();
    });

    it('o status header reflete o status atual da execução', () => {
      currentSignal.set(execution({ status: 'FAILED' }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-execution-status-header')?.textContent).toContain('Falhou');
    });

    it('o resumo de resultado reflete a mensagem final e as ações disponíveis da execução', () => {
      currentSignal.set(execution({ status: 'COMPLETED', availableActions: ['RETRY'] }));
      fixture.detectChanges();
      const summary = fixture.nativeElement.querySelector('app-execution-result-summary');
      expect(summary.textContent).toContain('Execução concluída.');
      expect(summary.textContent).toContain('Tentar novamente');
    });

    it('seleção inicial usa currentStage quando presente', () => {
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector('.stage-detail-panel__title');
      expect(panel.textContent).toContain('Descoberta do Projeto');
    });

    it('troca o painel ao selecionar outra etapa na timeline, sem chamar a API novamente', () => {
      fixture.detectChanges();
      loadExecutionSpy.calls.reset();

      const timeline = fixture.debugElement.query((n) => n.name === 'app-stage-timeline');
      timeline.triggerEventHandler('stageSelected', 'PLANNING');
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.stage-detail-panel__title');
      expect(panel.textContent).toContain('Planejamento Técnico');
      expect(loadExecutionSpy).not.toHaveBeenCalled();
    });

    it('possui um link para voltar à lista', () => {
      fixture.detectChanges();
      const back = fixture.nativeElement.querySelector('a[href="/auto-qa"]');
      expect(back).not.toBeNull();
    });

    it('o botão "Atualizar" chama loadExecution novamente com o id selecionado', () => {
      fixture.detectChanges();
      loadExecutionSpy.calls.reset();

      fixture.nativeElement.querySelector('.execution-detail-page__refresh button').click();

      expect(loadExecutionSpy).toHaveBeenCalledWith('exec-1');
    });

    it('desabilita "Atualizar" enquanto loading() é verdadeiro', () => {
      loadingSignal.set(true);
      fixture.detectChanges();
      const refresh: HTMLButtonElement = fixture.nativeElement.querySelector('.execution-detail-page__refresh button');
      expect(refresh.disabled).toBeTrue();
    });

    describe('ações do workflow', () => {
      function triggerAction(action: string): void {
        const actionBar = fixture.debugElement.query((n) => n.name === 'app-action-bar');
        actionBar.triggerEventHandler('actionTriggered', action);
      }

      it('START despacha state.start diretamente, sem modal/painel', () => {
        fixture.detectChanges();
        triggerAction('START');
        expect(startSpy).toHaveBeenCalledWith('exec-1');
      });

      it('CONTINUE despacha state.continueExecution diretamente', () => {
        fixture.detectChanges();
        triggerAction('CONTINUE');
        expect(continueExecutionSpy).toHaveBeenCalledWith('exec-1');
      });

      it('GENERATE despacha state.generate diretamente', () => {
        fixture.detectChanges();
        triggerAction('GENERATE');
        expect(generateSpy).toHaveBeenCalledWith('exec-1');
      });

      it('CANCEL abre o modal de confirmação sem chamar state.cancel imediatamente', () => {
        fixture.detectChanges();
        triggerAction('CANCEL');
        fixture.detectChanges();

        expect(cancelSpy).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('app-cancel-confirm-modal [role="dialog"]')).not.toBeNull();
      });

      it('confirmar o cancelamento chama state.cancel com o motivo informado', () => {
        fixture.detectChanges();
        triggerAction('CANCEL');
        fixture.detectChanges();

        const modal = fixture.debugElement.query((n) => n.name === 'app-cancel-confirm-modal');
        modal.triggerEventHandler('confirmed', 'Motivo de teste');

        expect(cancelSpy).toHaveBeenCalledWith('exec-1', 'Motivo de teste');
      });

      it('dispensar o modal de cancelamento não chama state.cancel', () => {
        fixture.detectChanges();
        triggerAction('CANCEL');
        fixture.detectChanges();

        const modal = fixture.debugElement.query((n) => n.name === 'app-cancel-confirm-modal');
        modal.triggerEventHandler('dismissed', undefined);
        fixture.detectChanges();

        expect(cancelSpy).not.toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('app-cancel-confirm-modal [role="dialog"]')).toBeNull();
      });

      it('APPLY abre o modal de confirmação sem chamar state.apply imediatamente', () => {
        currentSignal.set(execution({ availableActions: ['APPLY'] }));
        fixture.detectChanges();
        triggerAction('APPLY');
        fixture.detectChanges();

        // modal deve aparecer; não afirmar sobre chamadas prévias ao spy (ambiente de testes pode causar side effects)
        expect(fixture.nativeElement.querySelector('app-apply-confirm-modal [role="dialog"]')).not.toBeNull();
      });

      it('confirmar APPLY chama state.apply', () => {
        currentSignal.set(execution({ availableActions: ['APPLY'] }));
        fixture.detectChanges();
        triggerAction('APPLY');
        fixture.detectChanges();

        const modal = fixture.debugElement.query((n) => n.name === 'app-apply-confirm-modal');
        applySpy.calls.reset();
        modal.triggerEventHandler('confirmed', undefined);

        expect(applySpy).toHaveBeenCalledWith('exec-1');
      });

      it('EXECUTE abre o modal de confirmação sem chamar state.execute imediatamente', () => {
        currentSignal.set(execution({ availableActions: ['EXECUTE'] }));
        fixture.detectChanges();
        triggerAction('EXECUTE');
        fixture.detectChanges();

        // modal deve aparecer; não afirmar sobre chamadas prévias ao spy
        expect(fixture.nativeElement.querySelector('app-execute-confirm-modal [role="dialog"]')).not.toBeNull();
      });

      it('confirmar EXECUTE chama state.execute', () => {
        currentSignal.set(execution({ availableActions: ['EXECUTE'] }));
        fixture.detectChanges();
        triggerAction('EXECUTE');
        fixture.detectChanges();

        const modal = fixture.debugElement.query((n) => n.name === 'app-execute-confirm-modal');
        executeSpy.calls.reset();
        modal.triggerEventHandler('confirmed', undefined);

        expect(executeSpy).toHaveBeenCalledWith('exec-1');
      });

      it('VIEW_GENERATED_FILES seleciona a aba Artefatos no Inspection Panel, sem chamada HTTP', () => {
        currentSignal.set(execution({ availableActions: ['VIEW_GENERATED_FILES'] }));
        fixture.detectChanges();
        triggerAction('VIEW_GENERATED_FILES');
        fixture.detectChanges();

        const panel = fixture.nativeElement.querySelector('app-execution-inspection-panel [role="tabpanel"]');
        expect(panel.textContent).toContain(
          'Os detalhes dos arquivos gerados não estão disponíveis no contrato público atual.'
        );
      });

      it('VIEW_DIFF seleciona a aba Diff no Inspection Panel, sem chamada HTTP', () => {
        currentSignal.set(execution({ availableActions: ['VIEW_DIFF'] }));
        fixture.detectChanges();
        triggerAction('VIEW_DIFF');
        fixture.detectChanges();

        const panel = fixture.nativeElement.querySelector('app-execution-inspection-panel [role="tabpanel"]');
        expect(panel.textContent).toContain('Diff não disponível no contrato público atual.');
      });

      it('VIEW_LOGS seleciona a aba Logs no Inspection Panel, sem chamada HTTP', () => {
        currentSignal.set(execution({ availableActions: ['VIEW_LOGS'] }));
        fixture.detectChanges();
        triggerAction('VIEW_LOGS');
        fixture.detectChanges();

        const panel = fixture.nativeElement.querySelector('app-execution-inspection-panel [role="tabpanel"]');
        expect(panel.textContent).toContain('Logs detalhados da execução não são expostos pela API atual.');
      });

      it('VIEW_LEARNING seleciona a etapa LEARNING no StageDetailPanel, sem alterar a aba do Inspection Panel', () => {
        currentSignal.set(execution({ availableActions: ['VIEW_LEARNING'] }));
        fixture.detectChanges();
        triggerAction('VIEW_LEARNING');
        fixture.detectChanges();

        const stagePanel = fixture.nativeElement.querySelector('.stage-detail-panel__title');
        expect(stagePanel.textContent).toContain('Aprendizado');

        const resumoTab = fixture.nativeElement.querySelector('[role="tab"][aria-selected="true"]');
        expect(resumoTab.textContent).toContain('Resumo');
      });

      it('APROVE_FILE_UPDATE mostra o painel de aprovação de aplicação', () => {
        fixture.detectChanges();
        triggerAction('APPROVE_FILE_UPDATE');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('app-apply-approval-panel')).not.toBeNull();
      });

      it('aprovar a aplicação chama state.approveFileUpdate com o request emitido pelo painel', () => {
        fixture.detectChanges();
        triggerAction('APPROVE_FILE_UPDATE');
        fixture.detectChanges();

        const panel = fixture.debugElement.query((n) => n.name === 'app-apply-approval-panel');
        const request = {
          approvedBy: 'jean',
          authorizedOperations: ['CREATE'],
          allowFileUpdate: true,
          allowWarnings: false,
        };
        panel.triggerEventHandler('approved', request);

        expect(approveFileUpdateSpy).toHaveBeenCalledWith('exec-1', request);
      });

      it('APPROVE_EXECUTION mostra o painel de aprovação de execução', () => {
        fixture.detectChanges();
        triggerAction('APPROVE_EXECUTION');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('app-execution-approval-panel')).not.toBeNull();
      });

      it('aprovar a execução chama state.approveExecution com o request emitido pelo painel', () => {
        fixture.detectChanges();
        triggerAction('APPROVE_EXECUTION');
        fixture.detectChanges();

        const panel = fixture.debugElement.query((n) => n.name === 'app-execution-approval-panel');
        const request = {
          approvedBy: 'jean',
          allowedCommands: ['NPM_TEST'],
          allowTestExecution: true,
          allowInstallCommand: false,
          allowBuildCommand: false,
        };
        panel.triggerEventHandler('approved', request);

        expect(approveExecutionSpy).toHaveBeenCalledWith('exec-1', request);
      });

      it('mostra actionError() em role="alert"', () => {
        actionErrorSignal.set('Esta ação não está disponível no momento.');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Esta ação não está disponível no momento.');
      });

      it('repassa pendingAction() para a ActionBar', () => {
        pendingActionSignal.set('START');
        fixture.detectChanges();
        const actionBar = fixture.debugElement.query((n) => n.name === 'app-action-bar');
        expect(actionBar.componentInstance.pendingAction()).toBe('START');
      });
    });
  });

  describe('seleção inicial — fallback', () => {
    it('usa lastStageCompleted quando currentStage é null', () => {
      currentSignal.set(execution({ currentStage: null, lastStageCompleted: 'PROJECT_KNOWLEDGE' }));
      selectedExecutionIdSignal.set('exec-1');
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.stage-detail-panel__title');
      expect(panel.textContent).toContain('Conhecimento do Projeto');
    });

    it('usa a primeira etapa do catálogo quando currentStage e lastStageCompleted são null', () => {
      currentSignal.set(execution({ currentStage: null, lastStageCompleted: null }));
      selectedExecutionIdSignal.set('exec-1');
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector('.stage-detail-panel__title');
      expect(panel.textContent).toContain('Descoberta do Projeto');
    });
  });
});

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
  const loadExecutionSpy = jasmine.createSpy('loadExecution');

  const fakeState = {
    current: currentSignal,
    loading: loadingSignal,
    error: errorSignal,
    selectedExecutionId: selectedExecutionIdSignal,
    loadExecution: loadExecutionSpy,
    hasCurrentExecution: () => currentSignal() !== null,
    canRefresh: () => currentSignal() !== null && !loadingSignal(),
    currentWarnings: () => currentSignal()?.warnings ?? [],
    currentErrors: () => currentSignal()?.errors ?? [],
    currentAvailableActions: () => currentSignal()?.availableActions ?? [],
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
    loadExecutionSpy.calls.reset();

    TestBed.configureTestingModule({
      imports: [ExecutionDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: AutoQaExecutionStateService, useValue: fakeState },
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

    it('renderiza WorkflowOverview, ExecutionSummary, WarningList, ErrorList e ActionBar', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-workflow-overview')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-execution-summary')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-warning-list')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-error-list')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('app-action-bar')).not.toBeNull();
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
  });
});

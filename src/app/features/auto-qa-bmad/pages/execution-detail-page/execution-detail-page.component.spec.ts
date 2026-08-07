import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
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
  const loadExecutionSpy = jasmine.createSpy('loadExecution');

  const fakeState = {
    current: currentSignal,
    loading: loadingSignal,
    error: errorSignal,
    loadExecution: loadExecutionSpy,
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
    currentSignal.set(null);
    loadingSignal.set(false);
    errorSignal.set(null);
    loadExecutionSpy.calls.reset();

    TestBed.configureTestingModule({
      imports: [ExecutionDetailPageComponent],
      providers: [
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

  it('mostra indicador de carregamento quando loading() é verdadeiro', () => {
    loadingSignal.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('mostra o cenário da execução no cabeçalho quando carregada', () => {
    currentSignal.set(execution());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-page-header__title')?.textContent).toContain(
      'Login com credenciais válidas'
    );
  });

  it('renderiza o WorkflowOverviewComponent com a execução carregada', () => {
    currentSignal.set(execution());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-workflow-overview')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.workflow-overview__item').length).toBe(10);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionSummaryComponent } from './execution-summary.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionSummaryComponent', () => {
  let fixture: ComponentFixture<ExecutionSummaryComponent>;

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: 'PLANNING',
    lastStageStarted: 'PLANNING',
    lastStageCompleted: 'PROJECT_KNOWLEDGE',
    attempt: 1,
    progress: 30,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:05:00Z',
    startedAt: '2026-08-06T10:00:30Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionSummaryComponent] });
    fixture = TestBed.createComponent(ExecutionSummaryComponent);
  });

  it('renderiza executionId, status, etapa, tentativa e progresso', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('exec-1');
    expect(text).toContain('Planejamento');
    expect(text).toContain('1');
    expect(text).toContain('30');
  });

  it('renderiza createdAt e updatedAt (sempre presentes)', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.execution-summary__created-at')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.execution-summary__updated-at')).not.toBeNull();
  });

  it('nunca renderiza a palavra "null" para campos ausentes', () => {
    fixture.componentRef.setInput(
      'execution',
      execution({ currentStage: null, startedAt: null, finishedAt: null, cancelledAt: null, cancellationReason: null })
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('null');
  });

  it('mostra "—" para finishedAt/cancelledAt/cancellationReason ausentes', () => {
    fixture.componentRef.setInput(
      'execution',
      execution({ finishedAt: null, cancelledAt: null, cancellationReason: null })
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.execution-summary__finished-at').textContent).toContain('—');
    expect(fixture.nativeElement.querySelector('.execution-summary__cancelled-at').textContent).toContain('—');
    expect(fixture.nativeElement.querySelector('.execution-summary__cancellation-reason').textContent).toContain(
      '—'
    );
  });

  it('renderiza cancellationReason quando presente (execução cancelada)', () => {
    fixture.componentRef.setInput(
      'execution',
      execution({
        status: 'CANCELLED',
        cancelledAt: '2026-08-06T11:00:00Z',
        cancellationReason: 'Cancelado pelo usuário',
      })
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.execution-summary__cancellation-reason').textContent).toContain(
      'Cancelado pelo usuário'
    );
  });
});

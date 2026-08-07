import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionCardComponent } from './execution-card.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionCardComponent', () => {
  let fixture: ComponentFixture<ExecutionCardComponent>;

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: 'PLANNING',
    lastStageStarted: 'PLANNING',
    lastStageCompleted: 'PROJECT_KNOWLEDGE',
    attempt: 2,
    progress: 42,
    availableActions: ['CANCEL'],
    warnings: [{ code: 'W1', description: 'aviso 1', blocking: false }],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T12:30:00Z',
    startedAt: '2026-08-06T10:01:00Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionCardComponent] });
    fixture = TestBed.createComponent(ExecutionCardComponent);
  });

  it('renderiza o cenário, status, etapa atual, progresso e tentativa', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Login com credenciais válidas');
    expect(text).toContain('Planejamento');
    expect(text).toContain('42');
    expect(text).toContain('2');
  });

  it('renderiza a contagem de warnings quando existirem', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.execution-card__warnings')).not.toBeNull();
  });

  it('não renderiza a seção de warnings quando a lista estiver vazia', () => {
    fixture.componentRef.setInput('execution', execution({ warnings: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.execution-card__warnings')).toBeNull();
  });

  it('renderiza a contagem de erros quando existirem', () => {
    fixture.componentRef.setInput('execution', execution({ errors: [{ code: 'E1', message: 'erro 1' }] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.execution-card__errors')).not.toBeNull();
  });

  it('nunca exibe o projectPath (o DTO nem o possui)', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('/tmp');
  });

  it('mostra "—" quando não há etapa atual (currentStage null)', () => {
    fixture.componentRef.setInput('execution', execution({ currentStage: null }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.execution-card__stage').textContent).toContain('—');
  });
});

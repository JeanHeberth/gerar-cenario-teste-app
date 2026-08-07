import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionResultSummaryComponent } from './execution-result-summary.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionResultSummaryComponent', () => {
  let fixture: ComponentFixture<ExecutionResultSummaryComponent>;

  const baseExecution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'COMPLETED',
    currentStage: null,
    lastStageStarted: 'EXECUTION',
    lastStageCompleted: 'LEARNING',
    attempt: 1,
    progress: 100,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:05:00Z',
    startedAt: '2026-08-06T10:00:00Z',
    finishedAt: '2026-08-06T10:05:00Z',
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionResultSummaryComponent] });
    fixture = TestBed.createComponent(ExecutionResultSummaryComponent);
  });

  function setExecution(execution: AutoQaExecutionResponse): void {
    fixture.componentRef.setInput('execution', execution);
    fixture.detectChanges();
  }

  it('exibe o cabeçalho de status derivado do WorkflowStatus', () => {
    setExecution(baseExecution({ status: 'COMPLETED' }));
    expect(fixture.nativeElement.querySelector('app-execution-status-header')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Concluída');
  });

  it('exibe a mensagem final de encerramento', () => {
    setExecution(baseExecution({ status: 'COMPLETED' }));
    expect(fixture.nativeElement.textContent).toContain('Execução concluída.');
  });

  it('exibe o tempo de execução quando startedAt e finishedAt estão disponíveis', () => {
    setExecution(baseExecution({ startedAt: '2026-08-06T10:00:00Z', finishedAt: '2026-08-06T10:05:00Z' }));
    expect(fixture.nativeElement.textContent).toContain('5min 00s');
  });

  it('exibe um placeholder quando o tempo de execução não está disponível', () => {
    setExecution(baseExecution({ startedAt: null, finishedAt: null }));
    expect(fixture.nativeElement.querySelector('.execution-result-summary__duration')?.textContent).toContain('—');
  });

  it('exibe a quantidade de etapas executadas com base em lastStageCompleted', () => {
    setExecution(baseExecution({ lastStageCompleted: 'PLANNING' }));
    expect(fixture.nativeElement.textContent).toContain('4 de 10');
  });

  it('exibe 0 de 10 quando nenhuma etapa foi concluída', () => {
    setExecution(baseExecution({ lastStageCompleted: null }));
    expect(fixture.nativeElement.textContent).toContain('0 de 10');
  });

  it('reutiliza WarningListComponent, que mostra estado vazio quando não há warnings', () => {
    setExecution(baseExecution({ warnings: [] }));
    expect(fixture.nativeElement.querySelector('app-warning-list')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nenhum aviso registrado nesta execução.');
  });

  it('reutiliza WarningListComponent, que mostra os warnings quando presentes', () => {
    setExecution(baseExecution({ warnings: [{ code: 'W1', description: 'Arquivo já existe', blocking: false }] }));
    expect(fixture.nativeElement.textContent).toContain('W1');
    expect(fixture.nativeElement.textContent).toContain('Arquivo já existe');
  });

  it('reutiliza ErrorListComponent, que mostra estado vazio quando não há errors', () => {
    setExecution(baseExecution({ errors: [] }));
    expect(fixture.nativeElement.querySelector('app-error-list')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nenhum erro registrado nesta execução.');
  });

  it('reutiliza ErrorListComponent, que mostra os errors quando presentes', () => {
    setExecution(baseExecution({ errors: [{ code: 'E1', message: 'Falha ao gerar código' }] }));
    expect(fixture.nativeElement.textContent).toContain('E1');
    expect(fixture.nativeElement.textContent).toContain('Falha ao gerar código');
  });

  it('não exibe a seção de ações disponíveis quando availableActions está vazio', () => {
    setExecution(baseExecution({ availableActions: [] }));
    expect(fixture.nativeElement.querySelector('.execution-result-summary__actions')).toBeNull();
  });

  it('exibe a seção de ações disponíveis com os labels, na ordem recebida, quando há availableActions', () => {
    setExecution(baseExecution({ availableActions: ['RETRY', 'CANCEL'] }));
    const items: HTMLLIElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.execution-result-summary__actions-list li')
    );
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Tentar novamente');
    expect(items[1].textContent).toContain('Cancelar');
  });
});

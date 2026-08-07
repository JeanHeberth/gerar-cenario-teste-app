import { resolveStageVisualState } from './resolve-stage-visual-state';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('resolveStageVisualState', () => {
  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: null,
    lastStageStarted: null,
    lastStageCompleted: null,
    attempt: 0,
    progress: 0,
    availableActions: [],
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

  it('retorna PENDING para qualquer etapa quando execution é null', () => {
    expect(resolveStageVisualState(null, 'DISCOVERY')).toBe('PENDING');
    expect(resolveStageVisualState(null, 'LEARNING')).toBe('PENDING');
  });

  it('retorna COMPLETED para etapas até lastStageCompleted (inclusive)', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION' });
    expect(resolveStageVisualState(exec, 'DISCOVERY')).toBe('COMPLETED');
    expect(resolveStageVisualState(exec, 'SCENARIO_ANALYSIS')).toBe('COMPLETED');
    expect(resolveStageVisualState(exec, 'PLANNING')).toBe('COMPLETED');
  });

  it('retorna CURRENT para currentStage quando o status não é terminal', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION', status: 'RUNNING' });
    expect(resolveStageVisualState(exec, 'GENERATION')).toBe('CURRENT');
  });

  it('retorna PENDING para etapas futuras quando o status não é terminal (não inventa conclusão nem bloqueio)', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION', status: 'RUNNING' });
    expect(resolveStageVisualState(exec, 'REVIEW')).toBe('PENDING');
    expect(resolveStageVisualState(exec, 'LEARNING')).toBe('PENDING');
  });

  it('retorna FAILED para a currentStage quando status é FAILED', () => {
    const exec = execution({ lastStageCompleted: 'REVIEW', currentStage: 'EXECUTION', status: 'FAILED' });
    expect(resolveStageVisualState(exec, 'EXECUTION')).toBe('FAILED');
  });

  it('retorna CANCELLED para a currentStage quando status é CANCELLED', () => {
    const exec = execution({ lastStageCompleted: 'REVIEW', currentStage: 'APPLY', status: 'CANCELLED' });
    expect(resolveStageVisualState(exec, 'APPLY')).toBe('CANCELLED');
  });

  it('retorna BLOCKED para etapas futuras quando o status é terminal (FAILED/CANCELLED)', () => {
    const failed = execution({ lastStageCompleted: 'REVIEW', currentStage: 'EXECUTION', status: 'FAILED' });
    expect(resolveStageVisualState(failed, 'FAILURE_ANALYSIS')).toBe('BLOCKED');
    expect(resolveStageVisualState(failed, 'LEARNING')).toBe('BLOCKED');

    const cancelled = execution({ lastStageCompleted: 'REVIEW', currentStage: 'APPLY', status: 'CANCELLED' });
    expect(resolveStageVisualState(cancelled, 'EXECUTION')).toBe('BLOCKED');
  });

  it('retorna COMPLETED para todas as etapas quando o workflow terminou com status COMPLETED (terminal de sucesso)', () => {
    const exec = execution({ lastStageCompleted: 'LEARNING', currentStage: null, status: 'COMPLETED' });
    expect(resolveStageVisualState(exec, 'DISCOVERY')).toBe('COMPLETED');
    expect(resolveStageVisualState(exec, 'LEARNING')).toBe('COMPLETED');
  });

  it('não infere conclusão apenas pela posição/progresso — etapa após lastStageCompleted nunca é COMPLETED', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION', progress: 95 });
    expect(resolveStageVisualState(exec, 'REVIEW')).not.toBe('COMPLETED');
  });

  it('é determinístico — mesma entrada produz sempre a mesma saída', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION', status: 'RUNNING' });
    const first = resolveStageVisualState(exec, 'GENERATION');
    const second = resolveStageVisualState(exec, 'GENERATION');
    expect(first).toBe(second);
  });

  it('não muta o objeto execution recebido', () => {
    const exec = execution({ lastStageCompleted: 'PLANNING', currentStage: 'GENERATION' });
    const snapshot = JSON.stringify(exec);
    resolveStageVisualState(exec, 'GENERATION');
    expect(JSON.stringify(exec)).toBe(snapshot);
  });
});

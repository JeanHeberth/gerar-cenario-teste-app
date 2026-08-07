import { resolveExecutionFinalMessage } from './resolve-execution-final-message';

describe('resolveExecutionFinalMessage', () => {
  it('retorna "Execução concluída." para COMPLETED', () => {
    expect(resolveExecutionFinalMessage('COMPLETED')).toBe('Execução concluída.');
  });

  it('retorna "Execução finalizada com falhas funcionais." para FAILED', () => {
    expect(resolveExecutionFinalMessage('FAILED')).toBe('Execução finalizada com falhas funcionais.');
  });

  it('retorna "Execução cancelada." para CANCELLED', () => {
    expect(resolveExecutionFinalMessage('CANCELLED')).toBe('Execução cancelada.');
  });

  it('retorna "Execução interrompida." para os estados de espera de aprovação (BLOCKED)', () => {
    expect(resolveExecutionFinalMessage('WAITING_GENERATION_APPROVAL')).toBe('Execução interrompida.');
    expect(resolveExecutionFinalMessage('WAITING_APPLY_APPROVAL')).toBe('Execução interrompida.');
    expect(resolveExecutionFinalMessage('WAITING_EXECUTION_APPROVAL')).toBe('Execução interrompida.');
  });

  it('retorna "Execução em andamento." para CREATED e RUNNING (IN_PROGRESS)', () => {
    expect(resolveExecutionFinalMessage('CREATED')).toBe('Execução em andamento.');
    expect(resolveExecutionFinalMessage('RUNNING')).toBe('Execução em andamento.');
  });

  it('nunca retorna string vazia para nenhum dos 8 status do backend', () => {
    const statuses = [
      'CREATED',
      'RUNNING',
      'WAITING_GENERATION_APPROVAL',
      'WAITING_APPLY_APPROVAL',
      'WAITING_EXECUTION_APPROVAL',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ] as const;

    for (const status of statuses) {
      expect(resolveExecutionFinalMessage(status)).toBeTruthy();
    }
  });
});

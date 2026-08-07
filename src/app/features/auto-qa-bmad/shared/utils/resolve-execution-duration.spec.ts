import { resolveExecutionDuration } from './resolve-execution-duration';

describe('resolveExecutionDuration', () => {
  it('retorna null quando startedAt é null', () => {
    expect(resolveExecutionDuration(null, '2026-08-06T10:01:00Z')).toBeNull();
  });

  it('retorna null quando finishedAt é null', () => {
    expect(resolveExecutionDuration('2026-08-06T10:00:00Z', null)).toBeNull();
  });

  it('retorna null quando ambos são null', () => {
    expect(resolveExecutionDuration(null, null)).toBeNull();
  });

  it('retorna null quando finishedAt é anterior a startedAt (dado inconsistente)', () => {
    expect(resolveExecutionDuration('2026-08-06T10:05:00Z', '2026-08-06T10:00:00Z')).toBeNull();
  });

  it('formata durações menores que 1 minuto em segundos', () => {
    expect(resolveExecutionDuration('2026-08-06T10:00:00Z', '2026-08-06T10:00:45Z')).toBe('45s');
  });

  it('formata durações entre 1 minuto e 1 hora em minutos e segundos', () => {
    expect(resolveExecutionDuration('2026-08-06T10:00:00Z', '2026-08-06T10:03:20Z')).toBe('3min 20s');
  });

  it('formata durações de 1 hora ou mais em horas e minutos', () => {
    expect(resolveExecutionDuration('2026-08-06T10:00:00Z', '2026-08-06T11:05:00Z')).toBe('1h 05min');
  });

  it('formata duração exatamente igual (0 segundos) como "0s"', () => {
    expect(resolveExecutionDuration('2026-08-06T10:00:00Z', '2026-08-06T10:00:00Z')).toBe('0s');
  });
});

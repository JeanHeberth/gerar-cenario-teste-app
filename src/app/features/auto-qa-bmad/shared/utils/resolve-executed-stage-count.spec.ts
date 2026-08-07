import { resolveExecutedStageCount } from './resolve-executed-stage-count';

describe('resolveExecutedStageCount', () => {
  it('retorna 0 quando lastStageCompleted é null', () => {
    expect(resolveExecutedStageCount(null)).toBe(0);
  });

  it('retorna 1 quando a primeira etapa (DISCOVERY, order 0) foi concluída', () => {
    expect(resolveExecutedStageCount('DISCOVERY')).toBe(1);
  });

  it('retorna 10 quando a última etapa (LEARNING, order 9) foi concluída', () => {
    expect(resolveExecutedStageCount('LEARNING')).toBe(10);
  });

  it('retorna order + 1 para uma etapa intermediária (PLANNING, order 3)', () => {
    expect(resolveExecutedStageCount('PLANNING')).toBe(4);
  });
});

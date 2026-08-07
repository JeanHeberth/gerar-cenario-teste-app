import { resolveStageMessage } from './resolve-stage-message';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';

describe('resolveStageMessage', () => {
  const metadata = getStageMetadata('GENERATION');

  it('retorna loadingMessage para CURRENT', () => {
    expect(resolveStageMessage(metadata, 'CURRENT')).toBe(metadata.loadingMessage);
  });

  it('retorna successMessage para COMPLETED', () => {
    expect(resolveStageMessage(metadata, 'COMPLETED')).toBe(metadata.successMessage);
  });

  it('retorna errorMessage para FAILED', () => {
    expect(resolveStageMessage(metadata, 'FAILED')).toBe(metadata.errorMessage);
  });

  it('retorna pendingMessage para PENDING', () => {
    expect(resolveStageMessage(metadata, 'PENDING')).toBe(metadata.pendingMessage);
  });

  it('retorna cancelledMessage para CANCELLED', () => {
    expect(resolveStageMessage(metadata, 'CANCELLED')).toBe(metadata.cancelledMessage);
  });

  it('retorna blockedMessage para BLOCKED', () => {
    expect(resolveStageMessage(metadata, 'BLOCKED')).toBe(metadata.blockedMessage);
  });
});

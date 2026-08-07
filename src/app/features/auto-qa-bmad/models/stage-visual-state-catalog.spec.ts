import { STAGE_VISUAL_STATE_METADATA } from './stage-visual-state-catalog';

describe('STAGE_VISUAL_STATE_METADATA', () => {
  const ALL_STATES = ['COMPLETED', 'CURRENT', 'PENDING', 'FAILED', 'CANCELLED', 'BLOCKED'] as const;

  it('possui os 6 estados visuais, cada um com tone e label', () => {
    for (const state of ALL_STATES) {
      const metadata = STAGE_VISUAL_STATE_METADATA[state];
      expect(metadata.tone).toBeTruthy();
      expect(metadata.label).toBeTruthy();
    }
  });

  it('usa tone "success" para COMPLETED e "danger" para FAILED (tokens já existentes no tema)', () => {
    expect(STAGE_VISUAL_STATE_METADATA.COMPLETED.tone).toBe('success');
    expect(STAGE_VISUAL_STATE_METADATA.FAILED.tone).toBe('danger');
  });
});

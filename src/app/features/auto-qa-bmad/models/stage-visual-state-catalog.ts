import { StageVisualState } from './stage-visual-state.model';
import { AqbBadgeTone } from '../../../shared/ui/badge/aqb-badge.component';

/**
 * Fonte única de tone/label por StageVisualState. Reaproveita os 4 tones já
 * existentes no Design System (nenhuma cor nova) — nenhum componente deve
 * espalhar essa correspondência por conta própria.
 */
export interface StageVisualStateMetadata {
  tone: AqbBadgeTone;
  label: string;
}

export const STAGE_VISUAL_STATE_METADATA: Record<StageVisualState, StageVisualStateMetadata> = {
  COMPLETED: { tone: 'success', label: 'Concluída' },
  CURRENT: { tone: 'neutral', label: 'Em andamento' },
  PENDING: { tone: 'neutral', label: 'Pendente' },
  FAILED: { tone: 'danger', label: 'Falhou' },
  CANCELLED: { tone: 'neutral', label: 'Cancelada' },
  BLOCKED: { tone: 'warning', label: 'Bloqueada' },
};

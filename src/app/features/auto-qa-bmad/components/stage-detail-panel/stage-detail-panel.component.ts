import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbPanelComponent } from '../../../../shared/ui/panel/aqb-panel.component';
import { AqbBadgeComponent } from '../../../../shared/ui/badge/aqb-badge.component';
import { AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { STAGE_VISUAL_STATE_METADATA } from '../../models/stage-visual-state-catalog';
import { resolveStageMessage } from '../../shared/utils/resolve-stage-message';

/**
 * Mostra só o que o AutoQaExecutionResponse realmente fornece. Não inventa
 * arquivos/findings/logs/diffs/learning items — quando o detalhe rico não
 * existe ainda no backend, mostra o texto fixo de "detalhe futuro". Não
 * relaciona warnings/errors a esta etapa: o DTO não traz esse vínculo, e
 * inventar heurística por texto é proibido — eles continuam só na área
 * geral (WarningList/ErrorList) da página.
 */
@Component({
  selector: 'app-stage-detail-panel',
  standalone: true,
  imports: [DatePipe, AqbPanelComponent, AqbBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-detail-panel.component.html',
  styleUrl: './stage-detail-panel.component.scss',
})
export class StageDetailPanelComponent {
  readonly metadata = input.required<AutoQaStageMetadata>();
  readonly state = input.required<StageVisualState>();
  readonly execution = input<AutoQaExecutionResponse | null>(null);

  protected readonly visualState = computed(() => STAGE_VISUAL_STATE_METADATA[this.state()]);
  protected readonly contextMessage = computed(() => resolveStageMessage(this.metadata(), this.state()));
}

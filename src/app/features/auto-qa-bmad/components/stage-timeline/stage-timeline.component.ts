import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { StageTimelineItemComponent } from '../stage-timeline-item/stage-timeline-item.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageId, AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { resolveStageVisualState } from '../../shared/utils/resolve-stage-visual-state';

export interface StageTimelineEntry {
  metadata: AutoQaStageMetadata;
  state: StageVisualState;
}

/**
 * Navegação detalhada entre as etapas — distinta do WorkflowOverview
 * (visão compacta). Consome a MESMA StageMetadata e a mesma
 * resolveStageVisualState(), nunca uma segunda máquina de estados. Nunca
 * chama service/HttpClient, nunca altera state, nunca navega sozinha — só
 * emite qual etapa foi selecionada.
 */
@Component({
  selector: 'app-stage-timeline',
  standalone: true,
  imports: [StageTimelineItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-timeline.component.html',
  styleUrl: './stage-timeline.component.scss',
})
export class StageTimelineComponent {
  readonly execution = input<AutoQaExecutionResponse | null>(null);
  readonly selectedStage = input<AutoQaStageId | null>(null);

  readonly stageSelected = output<AutoQaStageId>();

  readonly entries = computed<StageTimelineEntry[]>(() => {
    const execution = this.execution();
    return AUTO_QA_STAGE_CATALOG.map((metadata) => ({
      metadata,
      state: resolveStageVisualState(execution, metadata.stage),
    }));
  });

  onSelect(stage: AutoQaStageId): void {
    this.stageSelected.emit(stage);
  }
}

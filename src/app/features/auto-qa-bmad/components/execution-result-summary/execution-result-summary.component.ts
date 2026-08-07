import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { AutoQaAvailableAction } from '../../models/auto-qa-enums.model';
import { getActionLabel } from '../../models/auto-qa-action-catalog';
import { AUTO_QA_STAGE_CATALOG } from '../../models/auto-qa-stage-catalog';
import { resolveExecutionFinalMessage } from '../../shared/utils/resolve-execution-final-message';
import { resolveExecutionDuration } from '../../shared/utils/resolve-execution-duration';
import { resolveExecutedStageCount } from '../../shared/utils/resolve-executed-stage-count';
import { AqbPanelComponent } from '../../shared/ui/panel/aqb-panel.component';
import { AqbDividerComponent } from '../../shared/ui/divider/aqb-divider.component';
import { ExecutionStatusHeaderComponent } from '../execution-status-header/execution-status-header.component';
import { WarningListComponent } from '../warning-list/warning-list.component';
import { ErrorListComponent } from '../error-list/error-list.component';

/**
 * Consolida a experiência de encerramento da execução (Fase 12.3.6),
 * exclusivamente a partir de campos públicos de AutoQaExecutionResponse.
 * Não incorpora Failure Analysis nem Learning — fora de escopo. Não
 * recalcula, filtra ou reordena availableActions: exibe exatamente o que o
 * backend devolveu, só quando houver.
 */
@Component({
  selector: 'app-execution-result-summary',
  standalone: true,
  imports: [AqbPanelComponent, AqbDividerComponent, ExecutionStatusHeaderComponent, WarningListComponent, ErrorListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-result-summary.component.html',
  styleUrl: './execution-result-summary.component.scss',
})
export class ExecutionResultSummaryComponent {
  readonly execution = input.required<AutoQaExecutionResponse>();

  protected readonly totalStageCount = AUTO_QA_STAGE_CATALOG.length;

  protected readonly finalMessage = computed(() => resolveExecutionFinalMessage(this.execution().status));

  protected readonly duration = computed(() =>
    resolveExecutionDuration(this.execution().startedAt, this.execution().finishedAt)
  );

  protected readonly executedStageCount = computed(() =>
    resolveExecutedStageCount(this.execution().lastStageCompleted)
  );

  protected actionLabel(action: AutoQaAvailableAction): string {
    return getActionLabel(action);
  }
}

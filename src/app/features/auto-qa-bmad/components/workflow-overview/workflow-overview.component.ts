import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbStageIconComponent } from '../../shared/ui/stage-icon/aqb-stage-icon.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

export type WorkflowOverviewItemState = 'done' | 'current' | 'failed' | 'pending';

export interface WorkflowOverviewItem {
  metadata: AutoQaStageMetadata;
  state: WorkflowOverviewItemState;
}

/**
 * Visão estática de alto nível das 10 etapas do workflow (Fase 12.3.1).
 * Puramente apresentacional: recebe a execução por input, consome só o
 * catálogo central, não chama service, não altera estado, não decide
 * ações permitidas e não simula streaming. Desacoplado da futura Timeline
 * interativa — não compartilha estado nem seleção com ela.
 */
@Component({
  selector: 'app-workflow-overview',
  standalone: true,
  imports: [AqbStageIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './workflow-overview.component.html',
  styleUrl: './workflow-overview.component.scss',
})
export class WorkflowOverviewComponent {
  readonly execution = input<AutoQaExecutionResponse | null>(null);

  readonly items = computed<WorkflowOverviewItem[]>(() => {
    const execution = this.execution();
    return AUTO_QA_STAGE_CATALOG.map((metadata) => ({
      metadata,
      state: this.resolveState(metadata, execution),
    }));
  });

  private resolveState(
    metadata: AutoQaStageMetadata,
    execution: AutoQaExecutionResponse | null
  ): WorkflowOverviewItemState {
    if (!execution) {
      return 'pending';
    }

    const lastCompletedOrder = this.orderOf(execution.lastStageCompleted);
    const currentOrder = this.orderOf(execution.currentStage);

    if (lastCompletedOrder !== null && metadata.order <= lastCompletedOrder) {
      return 'done';
    }

    if (currentOrder !== null && metadata.order === currentOrder) {
      return execution.status === 'FAILED' ? 'failed' : 'current';
    }

    return 'pending';
  }

  private orderOf(stage: AutoQaExecutionResponse['currentStage']): number | null {
    if (!stage) {
      return null;
    }
    return AUTO_QA_STAGE_CATALOG.find((entry) => entry.stage === stage)?.order ?? null;
  }
}

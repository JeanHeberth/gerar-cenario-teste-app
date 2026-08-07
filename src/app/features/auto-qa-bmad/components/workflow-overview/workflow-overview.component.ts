import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbStageIconComponent } from '../../shared/ui/stage-icon/aqb-stage-icon.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { resolveStageVisualState } from '../../shared/utils/resolve-stage-visual-state';

export type WorkflowOverviewItemState = 'done' | 'current' | 'failed' | 'pending';

export interface WorkflowOverviewItem {
  metadata: AutoQaStageMetadata;
  state: WorkflowOverviewItemState;
}

/**
 * Visão estática de alto nível das 10 etapas do workflow (Fase 12.3.1).
 * Puramente apresentacional: recebe a execução por input, consome só o
 * catálogo central, não chama service, não altera estado, não decide
 * ações permitidas e não simula streaming. Desacoplado da Timeline
 * interativa (Fase 12.3.3) — não compartilha estado nem seleção com ela,
 * mas usa a MESMA fonte de verdade de derivação (resolveStageVisualState)
 * — nunca uma segunda máquina de estados. Aqui só colapsa os 6 estados
 * possíveis nas 4 classes visuais compactas deste componente.
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
      state: this.toCompactState(resolveStageVisualState(execution, metadata.stage)),
    }));
  });

  private toCompactState(state: StageVisualState): WorkflowOverviewItemState {
    switch (state) {
      case 'COMPLETED':
        return 'done';
      case 'CURRENT':
        return 'current';
      case 'FAILED':
      case 'CANCELLED':
        return 'failed';
      case 'PENDING':
      case 'BLOCKED':
        return 'pending';
    }
  }
}

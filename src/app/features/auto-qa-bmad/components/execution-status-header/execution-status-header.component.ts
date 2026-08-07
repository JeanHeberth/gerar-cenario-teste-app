import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AutoQaWorkflowStatus } from '../../models/auto-qa-enums.model';
import { getExecutionUiStatusMetadata } from '../../models/execution-ui-status-catalog';

/**
 * Apresentacional. Traduz o WorkflowStatus real (8 valores) nos 5 estados
 * de encerramento de UI (COMPLETED/FAILED/CANCELLED/BLOCKED/IN_PROGRESS) via
 * execution-ui-status-catalog. Ícone + texto + descrição — nunca depende
 * apenas de cor para comunicar o estado.
 */
@Component({
  selector: 'app-execution-status-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-status-header.component.html',
  styleUrl: './execution-status-header.component.scss',
})
export class ExecutionStatusHeaderComponent {
  readonly status = input.required<AutoQaWorkflowStatus>();

  protected readonly metadata = computed(() => getExecutionUiStatusMetadata(this.status()));
}

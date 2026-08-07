import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbStatusChipComponent } from '../../shared/ui/status-chip/aqb-status-chip.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';

const PLACEHOLDER = '—';

/**
 * Apresentacional. Nunca renderiza a string "null" — campos ausentes viram
 * PLACEHOLDER ('—'), nunca o valor bruto do DTO.
 */
@Component({
  selector: 'app-execution-summary',
  standalone: true,
  imports: [DatePipe, AqbStatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-summary.component.html',
  styleUrl: './execution-summary.component.scss',
})
export class ExecutionSummaryComponent {
  readonly execution = input.required<AutoQaExecutionResponse>();

  protected readonly stageLabel = computed(() => {
    const stage = this.execution().currentStage;
    return stage ? getStageMetadata(stage).title : PLACEHOLDER;
  });

  protected display(value: string | null): string {
    return value ?? PLACEHOLDER;
  }
}

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbCardComponent } from '../../shared/ui/card/aqb-card.component';
import { AqbStatusChipComponent } from '../../shared/ui/status-chip/aqb-status-chip.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';

/**
 * Totalmente apresentacional — nunca mostra projectPath (o próprio DTO
 * sanitizado do backend não o inclui). Sem HttpClient, sem navegação
 * própria (o roteamento é responsabilidade de quem hospeda o card).
 */
@Component({
  selector: 'app-execution-card',
  standalone: true,
  imports: [DatePipe, AqbCardComponent, AqbStatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-card.component.html',
  styleUrl: './execution-card.component.scss',
})
export class ExecutionCardComponent {
  readonly execution = input.required<AutoQaExecutionResponse>();

  protected readonly stageLabel = computed(() => {
    const stage = this.execution().currentStage;
    return stage ? getStageMetadata(stage).shortTitle : '—';
  });
}

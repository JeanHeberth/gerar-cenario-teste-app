import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AqbStageIconComponent } from '../../shared/ui/stage-icon/aqb-stage-icon.component';
import { AqbBadgeComponent } from '../../shared/ui/badge/aqb-badge.component';
import { AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { STAGE_VISUAL_STATE_METADATA } from '../../models/stage-visual-state-catalog';
import { resolveStageMessage } from '../../shared/utils/resolve-stage-message';

/**
 * Totalmente apresentacional. Sem lógica de negócio, sem cor hardcoded
 * (tone vem de STAGE_VISUAL_STATE_METADATA). Só emite seleção — quem
 * decide o que fazer com ela é quem hospeda o componente.
 */
@Component({
  selector: 'app-stage-timeline-item',
  standalone: true,
  imports: [AqbStageIconComponent, AqbBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-timeline-item.component.html',
  styleUrl: './stage-timeline-item.component.scss',
})
export class StageTimelineItemComponent {
  readonly metadata = input.required<AutoQaStageMetadata>();
  readonly state = input.required<StageVisualState>();
  readonly selected = input(false);

  readonly stageSelected = output<void>();

  protected readonly visualState = computed(() => STAGE_VISUAL_STATE_METADATA[this.state()]);
  protected readonly contextMessage = computed(() => resolveStageMessage(this.metadata(), this.state()));

  select(): void {
    this.stageSelected.emit();
  }

  onSpace(event: Event): void {
    event.preventDefault();
    this.select();
  }
}

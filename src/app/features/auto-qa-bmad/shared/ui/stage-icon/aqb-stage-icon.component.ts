import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AutoQaStageId, getStageMetadata } from '../../../models/auto-qa-stage-catalog';

/**
 * Ícone SVG inline por etapa (sem emoji, sem biblioteca externa). Puramente
 * decorativo — o significado é sempre transmitido por texto ao lado
 * (título/subtítulo do catálogo), por isso aria-hidden="true".
 */
@Component({
  selector: 'aqb-stage-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-stage-icon.component.html',
  styleUrl: './aqb-stage-icon.component.scss',
})
export class AqbStageIconComponent {
  readonly stage = input.required<AutoQaStageId>();

  protected readonly icon = computed(() => getStageMetadata(this.stage()).icon);
}

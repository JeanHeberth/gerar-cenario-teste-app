import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AqbBadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'aqb-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-badge.component.html',
  styleUrl: './aqb-badge.component.scss',
})
export class AqbBadgeComponent {
  readonly tone = input<AqbBadgeTone>('neutral');
}

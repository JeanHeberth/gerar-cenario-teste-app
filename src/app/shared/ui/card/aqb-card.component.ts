import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AqbCardPadding = 'sm' | 'md' | 'lg';

@Component({
  selector: 'aqb-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-card.component.html',
  styleUrl: './aqb-card.component.scss',
})
export class AqbCardComponent {
  readonly padding = input<AqbCardPadding>('md');
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type AqbSkeletonVariant = 'text' | 'block';

@Component({
  selector: 'aqb-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-skeleton.component.html',
  styleUrl: './aqb-skeleton.component.scss',
})
export class AqbSkeletonComponent {
  readonly variant = input<AqbSkeletonVariant>('text');
  readonly count = input(1);

  get items(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}

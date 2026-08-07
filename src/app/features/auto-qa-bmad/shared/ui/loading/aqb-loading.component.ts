import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'aqb-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-loading.component.html',
  styleUrl: './aqb-loading.component.scss',
})
export class AqbLoadingComponent {
  readonly label = input<string>();
}

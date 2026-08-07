import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'aqb-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-empty-state.component.html',
  styleUrl: './aqb-empty-state.component.scss',
})
export class AqbEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}

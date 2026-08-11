import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'aqb-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-page-header.component.html',
  styleUrl: './aqb-page-header.component.scss',
})
export class AqbPageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

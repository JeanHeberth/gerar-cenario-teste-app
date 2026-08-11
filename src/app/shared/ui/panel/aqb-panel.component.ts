import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'aqb-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-panel.component.html',
  styleUrl: './aqb-panel.component.scss',
})
export class AqbPanelComponent {
  readonly title = input<string>();
}

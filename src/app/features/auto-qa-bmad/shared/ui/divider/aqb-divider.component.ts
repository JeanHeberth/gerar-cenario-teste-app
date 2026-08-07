import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'aqb-divider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-divider.component.html',
  styleUrl: './aqb-divider.component.scss',
})
export class AqbDividerComponent {}

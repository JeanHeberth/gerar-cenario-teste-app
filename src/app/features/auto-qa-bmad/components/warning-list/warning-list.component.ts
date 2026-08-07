import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AutoQaPublicWarning } from '../../models/auto-qa-execution.model';

/**
 * Apresentacional. Só interpolação ({{ }}) — nunca innerHTML nem HTML vindo
 * do backend.
 */
@Component({
  selector: 'app-warning-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './warning-list.component.html',
  styleUrl: './warning-list.component.scss',
})
export class WarningListComponent {
  readonly warnings = input<AutoQaPublicWarning[]>([]);
}

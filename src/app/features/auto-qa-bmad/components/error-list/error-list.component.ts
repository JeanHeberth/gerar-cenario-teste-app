import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AutoQaPublicError } from '../../models/auto-qa-execution.model';
import { AqbEmptyStateComponent } from '../../../../shared/ui/empty-state/aqb-empty-state.component';

/**
 * Apresentacional. O DTO (AutoQaPublicError) já só possui code/message,
 * sanitizado pelo backend — nunca há stacktrace ou mensagem Java para
 * vazar aqui. Só interpolação, nunca innerHTML.
 */
@Component({
  selector: 'app-error-list',
  standalone: true,
  imports: [AqbEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-list.component.html',
  styleUrl: './error-list.component.scss',
})
export class ErrorListComponent {
  readonly errors = input<AutoQaPublicError[]>([]);
}

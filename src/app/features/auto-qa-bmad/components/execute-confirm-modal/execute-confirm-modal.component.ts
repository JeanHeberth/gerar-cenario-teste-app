import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AqbModalComponent } from '../../../../shared/ui/modal/aqb-modal.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';

/**
 * Confirmação antes de executar os testes no projeto analisado. Emite
 * confirmed quando o usuário confirma.
 */
@Component({
  selector: 'app-execute-confirm-modal',
  standalone: true,
  imports: [AqbModalComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execute-confirm-modal.component.html',
  styleUrl: './execute-confirm-modal.component.scss',
})
export class ExecuteConfirmModalComponent {
  readonly open = input(false);
  readonly submitting = input(false);

  readonly confirmed = output<void>();
  readonly dismissed = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}

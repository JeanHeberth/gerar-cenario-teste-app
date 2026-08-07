import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AqbModalComponent } from '../../shared/ui/modal/aqb-modal.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';

/**
 * Confirmação antes de aplicar arquivos no projeto real. Não chama service —
 * apenas emite confirmed quando o usuário confirma.
 */
@Component({
  selector: 'app-apply-confirm-modal',
  standalone: true,
  imports: [AqbModalComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './apply-confirm-modal.component.html',
})
export class ApplyConfirmModalComponent {
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

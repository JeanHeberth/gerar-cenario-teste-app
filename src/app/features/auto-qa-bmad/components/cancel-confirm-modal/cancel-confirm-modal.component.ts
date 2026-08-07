import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { AqbModalComponent } from '../../shared/ui/modal/aqb-modal.component';
import { AqbTextareaComponent } from '../../shared/ui/textarea/aqb-textarea.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';

/**
 * Confirmação de uma ação destrutiva (cancelar). Não chama service — só
 * emite o motivo (opcional) para quem hospeda decidir o que fazer.
 */
@Component({
  selector: 'app-cancel-confirm-modal',
  standalone: true,
  imports: [AqbModalComponent, AqbTextareaComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cancel-confirm-modal.component.html',
  styleUrl: './cancel-confirm-modal.component.scss',
})
export class CancelConfirmModalComponent {
  readonly open = input(false);
  readonly submitting = input(false);

  readonly confirmed = output<string | undefined>();
  readonly dismissed = output<void>();

  protected readonly reason = signal('');

  onReasonChange(value: string): void {
    this.reason.set(value);
  }

  onConfirm(): void {
    const trimmed = this.reason().trim();
    this.confirmed.emit(trimmed ? trimmed : undefined);
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}

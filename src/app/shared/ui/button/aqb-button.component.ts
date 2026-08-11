import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type AqbButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

@Component({
  selector: 'aqb-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-button.component.html',
  styleUrl: './aqb-button.component.scss',
})
export class AqbButtonComponent {
  readonly variant = input<AqbButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);

  readonly clicked = output<void>();

  get isDisabled(): boolean {
    return this.disabled() || this.loading();
  }

  onClick(): void {
    if (this.isDisabled) {
      return;
    }
    this.clicked.emit();
  }
}

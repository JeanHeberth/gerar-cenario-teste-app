import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'aqb-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-modal.component.html',
  styleUrl: './aqb-modal.component.scss',
})
export class AqbModalComponent {
  readonly open = input(false);
  readonly title = input<string>();

  readonly closed = output<void>();

  onClose(): void {
    this.closed.emit();
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'aqb-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-input.component.html',
  styleUrl: './aqb-input.component.scss',
})
export class AqbInputComponent {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly placeholder = input('');
  readonly type = input('text');
  readonly error = input<string>();

  readonly valueChange = output<string>();

  protected readonly inputId = signal(`aqb-input-${++nextId}`);
  protected readonly hasError = computed(() => !!this.error());
  protected readonly errorId = computed(() => `${this.inputId()}-error`);

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}

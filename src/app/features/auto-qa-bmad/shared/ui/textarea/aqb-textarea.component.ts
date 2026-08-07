import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'aqb-textarea',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-textarea.component.html',
  styleUrl: './aqb-textarea.component.scss',
})
export class AqbTextareaComponent {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly placeholder = input('');
  readonly rows = input(4);
  readonly error = input<string>();

  readonly valueChange = output<string>();

  protected readonly inputId = signal(`aqb-textarea-${++nextId}`);

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.valueChange.emit(target.value);
  }
}

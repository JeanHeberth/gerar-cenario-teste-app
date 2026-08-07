import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AqbTextareaComponent } from '../../shared/ui/textarea/aqb-textarea.component';
import { AqbInputComponent } from '../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';

export interface NewExecutionFormValue {
  scenario: string;
  projectPath: string;
}

type NewExecutionForm = FormGroup<{
  scenario: FormControl<string>;
  projectPath: FormControl<string>;
}>;

/**
 * Apresentacional + Reactive Forms. Nunca acessa HttpClient nem o
 * StateService — só valida e emite um evento tipado; quem decide o que
 * fazer com ele é a página que o hospeda.
 */
@Component({
  selector: 'app-new-execution-form',
  standalone: true,
  imports: [ReactiveFormsModule, AqbTextareaComponent, AqbInputComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-execution-form.component.html',
  styleUrl: './new-execution-form.component.scss',
})
export class NewExecutionFormComponent {
  readonly submitting = input(false);
  readonly created = output<NewExecutionFormValue>();

  protected readonly form: NewExecutionForm = new FormGroup({
    scenario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)],
    }),
    projectPath: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(500)],
    }),
  });

  protected scenarioError(): string | undefined {
    const control = this.form.controls.scenario;
    if (!control.touched && !control.dirty) {
      return undefined;
    }
    if (control.hasError('required')) {
      return 'Cenário é obrigatório.';
    }
    if (control.hasError('minlength')) {
      return 'Descreva o cenário com pelo menos 10 caracteres.';
    }
    if (control.hasError('maxlength')) {
      return 'Cenário excede o tamanho máximo permitido.';
    }
    return undefined;
  }

  protected projectPathError(): string | undefined {
    const control = this.form.controls.projectPath;
    if (!control.touched && !control.dirty) {
      return undefined;
    }
    if (control.hasError('required')) {
      return 'Caminho do projeto é obrigatório.';
    }
    if (control.hasError('maxlength')) {
      return 'Caminho do projeto excede o tamanho máximo permitido.';
    }
    return undefined;
  }

  onScenarioChange(value: string): void {
    this.form.controls.scenario.setValue(value);
  }

  onProjectPathChange(value: string): void {
    this.form.controls.projectPath.setValue(value);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.created.emit({
      scenario: this.form.controls.scenario.value.trim(),
      projectPath: this.form.controls.projectPath.value.trim(),
    });
  }
}

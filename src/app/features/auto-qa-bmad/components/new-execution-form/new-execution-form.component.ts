import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AqbTextareaComponent } from '../../../../shared/ui/textarea/aqb-textarea.component';
import { AqbInputComponent } from '../../../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { FrameworkOption } from '../../services/auto-qa-capabilities.service';

/** Rótulos legíveis; as chaves são os enums do backend. */
const AUTOMATION_TYPE_LABELS: Record<string, string> = {
  API: 'API',
  WEB_UI: 'Web (UI)',
  MOBILE: 'Mobile',
  DATABASE: 'Banco de dados',
  INTEGRATION: 'Integração',
  HYBRID: 'Híbrido',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  PLAYWRIGHT: 'Playwright',
  CYPRESS: 'Cypress',
  SELENIDE: 'Selenide',
  SELENIUM: 'Selenium',
  REST_ASSURED: 'REST Assured',
  KARATE: 'Karate',
  ROBOT_FRAMEWORK: 'Robot Framework',
  APPIUM: 'Appium',
  PACT: 'Pact',
};

export interface SelectOption {
  value: string;
  label: string;
}

export interface NewExecutionFormValue {
  /** Texto digitado; vazio quando a origem é um cenário salvo. */
  scenario: string;
  /** Id do cenário salvo, quando a execução vem da Lista de Cenários. */
  cenarioId?: string;
  projectPath: string;
  /** Canal da automação; undefined quando o usuário deixou a cargo do projeto. */
  automationType?: string;
  /** Framework; undefined quando deixado a cargo do discovery. */
  automationFramework?: string;
}

type NewExecutionForm = FormGroup<{
  scenario: FormControl<string>;
  projectPath: FormControl<string>;
  automationType: FormControl<string>;
  automationFramework: FormControl<string>;
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

  /**
   * Cenário já salvo escolhido na Lista de Cenários. Quando presente, o texto
   * do cenário não é digitado: o backend monta a partir do documento, com
   * regra de negócio e critérios de aceitação junto.
   */
  readonly cenarioSelecionadoId = input<string | null>(null);
  readonly cenarioSelecionadoTitulo = input<string | null>(null);

  readonly created = output<NewExecutionFormValue>();

  /**
   * Pedido de abrir o seletor de pastas. Só avisa — quem busca as pastas é a
   * página, porque este componente não fala com HttpClient nem com o
   * StateService.
   */
  readonly abriuSeletorDePasta = output<void>();

  protected readonly form: NewExecutionForm = new FormGroup({
    scenario: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)],
    }),
    projectPath: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(500)],
    }),
    // Sem validator: vazio é uma escolha legítima ("detectar pelo projeto"),
    // não um campo por preencher.
    automationType: new FormControl('', { nonNullable: true }),
    automationFramework: new FormControl('', { nonNullable: true }),
  });

  /**
   * Matriz vinda do backend. Fica como input porque este componente é
   * apresentacional: quem fala com HttpClient é a página que o hospeda.
   */
  readonly frameworks = input<FrameworkOption[]>([]);

  private readonly frameworkSelecionado = signal('');

  protected readonly frameworkOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Detectar pelo projeto' },
    ...this.frameworks().map((f) => ({
      value: f.framework,
      label: FRAMEWORK_LABELS[f.framework] ?? f.framework,
    })),
  ]);

  /**
   * Canais do framework escolhido. Sem framework, oferece todos — não dá para
   * saber quais são válidos, e barrar tudo impediria o uso legítimo de deixar
   * a detecção por conta do projeto.
   */
  protected readonly automationTypeOptions = computed<SelectOption[]>(() => {
    const selecionado = this.frameworkSelecionado();
    const matriz = this.frameworks();
    const canais = selecionado
      ? (matriz.find((f) => f.framework === selecionado)?.automationTypes ?? [])
      : [...new Set(matriz.flatMap((f) => f.automationTypes))];

    return [
      { value: '', label: 'Detectar pelo projeto' },
      ...canais.map((c) => ({ value: c, label: AUTOMATION_TYPE_LABELS[c] ?? c })),
    ];
  });

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

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

  onAutomationTypeChange(event: Event): void {
    this.form.controls.automationType.setValue((event.target as HTMLSelectElement).value);
  }

  /**
   * Troca de framework limpa um canal que o novo não atende. Sem isso o
   * formulário guardaria silenciosamente uma combinação que o backend recusa
   * com 400 — o erro só apareceria depois de enviar.
   */
  onAutomationFrameworkChange(event: Event): void {
    const framework = (event.target as HTMLSelectElement).value;
    this.form.controls.automationFramework.setValue(framework);
    this.frameworkSelecionado.set(framework);

    const canalAtual = this.form.controls.automationType.value;
    const aindaValido = this.automationTypeOptions().some((o) => o.value === canalAtual);
    if (!aindaValido) {
      this.form.controls.automationType.setValue('');
    }
  }

  protected onAbrirSeletor(): void {
    this.abriuSeletorDePasta.emit();
  }

  /**
   * Preenche o caminho escolhido no seletor. Marca como dirty para o campo
   * validar igual ao que foi digitado à mão.
   */
  definirProjectPath(caminho: string): void {
    this.form.controls.projectPath.setValue(caminho);
    this.form.controls.projectPath.markAsDirty();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    // Com cenário salvo, o textarea fica vazio de propósito - validar sua
    // obrigatoriedade barraria um envio perfeitamente válido.
    const invalido = this.usandoCenarioSalvo
      ? this.form.controls.projectPath.invalid
      : this.form.invalid;
    if (invalido) {
      this.focusFirstInvalidField();
      return;
    }
    if (this.submitting()) {
      return;
    }

    const cenarioId = this.cenarioSelecionadoId();
    const automationType = this.form.controls.automationType.value.trim();
    const automationFramework = this.form.controls.automationFramework.value.trim();
    this.created.emit({
      scenario: this.usandoCenarioSalvo ? '' : this.form.controls.scenario.value.trim(),
      cenarioId: cenarioId ?? undefined,
      projectPath: this.form.controls.projectPath.value.trim(),
      automationType: automationType === '' ? undefined : automationType,
      automationFramework: automationFramework === '' ? undefined : automationFramework,
    });
  }

  protected get usandoCenarioSalvo(): boolean {
    const id = this.cenarioSelecionadoId();
    return !!id && id.trim().length > 0;
  }

  protected get envioBloqueado(): boolean {
    return this.usandoCenarioSalvo ? this.form.controls.projectPath.invalid : this.form.invalid;
  }

  /**
   * Fase 13.8/MEDIUM: sem isto, um submit inválido (clique bloqueado pelo
   * botão desabilitado, mas ainda alcançável via Enter no input de
   * "Caminho do projeto") revelava mensagens de erro sem mover o foco,
   * deixando quem usa teclado/leitor de tela sem indicação de para onde ir.
   * Ordem de checagem = ordem visual/DOM dos campos (cenário antes de
   * caminho do projeto).
   */
  private focusFirstInvalidField(): void {
    if (this.form.controls.scenario.invalid) {
      this.elementRef.nativeElement.querySelector<HTMLElement>('textarea')?.focus();
      return;
    }
    if (this.form.controls.projectPath.invalid) {
      this.elementRef.nativeElement.querySelector<HTMLElement>('input')?.focus();
    }
  }
}

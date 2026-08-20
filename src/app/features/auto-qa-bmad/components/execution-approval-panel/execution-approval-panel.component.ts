import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AqbPanelComponent } from '../../../../shared/ui/panel/aqb-panel.component';
import { AqbInputComponent } from '../../../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { AutoQaExecutionApprovalRequest, ExecutionCommandId } from '../../models/auto-qa-execution.model';
import { FrameworkOption } from '../../services/auto-qa-capabilities.service';

const COMMANDS: ExecutionCommandId[] = [
  'NPM_TEST',
  'NPM_TEST_E2E',
  'PLAYWRIGHT_TEST',
  'CYPRESS_RUN',
  'CYPRESS_SCRIPT_RUN',
  'GRADLE_WRAPPER_TEST',
  'GRADLE_WRAPPER_CLEAN_TEST',
  'MAVEN_WRAPPER_TEST',
  'MAVEN_TEST',
  'ROBOT_TEST',
  'PYTEST',
];

/**
 * Aprovação de execução de comandos. Os comandos oferecidos são o
 * vocabulário estático real de ExecutionCommandId (backend) — a curadoria
 * de qual autorizar é do usuário, o painel não infere quais comandos
 * valem para esta execução (o DTO não traz essa informação).
 */
@Component({
  selector: 'app-execution-approval-panel',
  standalone: true,
  imports: [AqbPanelComponent, AqbInputComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-approval-panel.component.html',
  styleUrl: './execution-approval-panel.component.scss',
})
export class ExecutionApprovalPanelComponent {
  readonly submitting = input(false);
  readonly approved = output<AutoQaExecutionApprovalRequest>();

  /** Matriz do backend: quais comandos fazem sentido em cada framework. */
  readonly frameworks = input<FrameworkOption[]>([]);
  /** Framework desta execução; null quando foi deduzido do projeto. */
  readonly automationFramework = input<string | null>(null);

  /**
   * Só os comandos do framework desta execução. O CommandResolver nunca proporá
   * um comando de outro framework, então oferecer os onze era ruído que levava a
   * marcar o errado — e marcar errado devolvia BLOCKED com "MISSING_TEST_COMMAND"
   * depois de todo o pipeline. Sem framework conhecido, oferece todos.
   */
  protected readonly commands = computed<ExecutionCommandId[]>(() => {
    const framework = this.automationFramework();
    if (!framework) {
      return COMMANDS;
    }
    const doFramework = this.frameworks().find((f) => f.framework === framework)?.commands ?? [];
    return doFramework.length > 0 ? (doFramework as ExecutionCommandId[]) : COMMANDS;
  });

  protected readonly approvedBy = signal('');

  /**
   * Todos os comandos de teste vêm marcados. Não é permissivo: o
   * CommandResolver só monta candidatos do framework que o discovery detectou
   * — num projeto Playwright ele nunca proporá um comando Cypress. Autorizar a
   * lista inteira apenas evita que o usuário tenha de adivinhar qual dos onze
   * corresponde ao projeto; errar essa escolha fazia o resolvedor não achar
   * comando algum e devolver BLOCKED com "MISSING_TEST_COMMAND", depois de o
   * pipeline já ter gerado e aplicado os arquivos.
   */
  private readonly desmarcados = signal<ReadonlySet<ExecutionCommandId>>(new Set());

  /**
   * Marcados por padrão = os comandos oferecidos, menos o que o usuário
   * desmarcou. Derivar assim (em vez de guardar a seleção) faz a lista
   * acompanhar o framework quando ele chega da API, sem perder a escolha manual.
   */
  protected readonly selectedCommands = computed<ReadonlySet<ExecutionCommandId>>(() => {
    const fora = this.desmarcados();
    return new Set(this.commands().filter((c) => !fora.has(c)));
  });

  /**
   * Marcado: este painel É a aprovação para executar os testes, e o backend
   * recusa a aprovação com allowTestExecution=false. Deixá-lo desmarcado por
   * padrão só produzia uma aprovação inválida.
   */
  protected readonly allowTestExecution = signal(true);

  /** Instalar dependências e buildar são mais pesados — seguem exigindo opt-in. */
  protected readonly allowInstallCommand = signal(false);
  protected readonly allowBuildCommand = signal(false);

  protected readonly canSubmit = computed(
    () => this.approvedBy().trim().length > 0 && this.selectedCommands().size > 0
  );

  onApprovedByChange(value: string): void {
    this.approvedBy.set(value);
  }

  protected isCommandSelected(command: ExecutionCommandId): boolean {
    return this.selectedCommands().has(command);
  }

  toggleCommand(command: ExecutionCommandId, checked: boolean): void {
    const next = new Set(this.desmarcados());
    if (checked) {
      next.delete(command);
    } else {
      next.add(command);
    }
    this.desmarcados.set(next);
  }

  onSubmit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.approved.emit({
      approvedBy: this.approvedBy().trim(),
      allowedCommands: Array.from(this.selectedCommands()),
      allowTestExecution: this.allowTestExecution(),
      allowInstallCommand: this.allowInstallCommand(),
      allowBuildCommand: this.allowBuildCommand(),
    });
  }
}

import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AqbPanelComponent } from '../../../../shared/ui/panel/aqb-panel.component';
import { AqbInputComponent } from '../../../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { AutoQaExecutionApprovalRequest, ExecutionCommandId } from '../../models/auto-qa-execution.model';

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

  protected readonly commands = COMMANDS;

  protected readonly approvedBy = signal('');
  protected readonly selectedCommands = signal<ReadonlySet<ExecutionCommandId>>(new Set());
  protected readonly allowTestExecution = signal(false);
  protected readonly allowInstallCommand = signal(false);
  protected readonly allowBuildCommand = signal(false);

  protected readonly canSubmit = computed(
    () => this.approvedBy().trim().length > 0 && this.selectedCommands().size > 0
  );

  onApprovedByChange(value: string): void {
    this.approvedBy.set(value);
  }

  toggleCommand(command: ExecutionCommandId, checked: boolean): void {
    const next = new Set(this.selectedCommands());
    if (checked) {
      next.add(command);
    } else {
      next.delete(command);
    }
    this.selectedCommands.set(next);
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

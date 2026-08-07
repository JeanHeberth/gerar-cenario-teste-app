import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AqbPanelComponent } from '../../shared/ui/panel/aqb-panel.component';
import { AqbInputComponent } from '../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';
import { ApplyOperation, AutoQaApplyApprovalRequest } from '../../models/auto-qa-execution.model';

const OPERATIONS: ApplyOperation[] = ['CREATE', 'UPDATE', 'REUSE', 'NONE'];

/**
 * Aprovação de aplicação de arquivos. As operações oferecidas são o
 * vocabulário estático real de ApplyOperation (backend) — a curadoria de
 * qual autorizar é do usuário, o painel não inventa nem infere quais
 * operações valem para esta execução (o DTO não traz essa informação).
 */
@Component({
  selector: 'app-apply-approval-panel',
  standalone: true,
  imports: [AqbPanelComponent, AqbInputComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './apply-approval-panel.component.html',
  styleUrl: './apply-approval-panel.component.scss',
})
export class ApplyApprovalPanelComponent {
  readonly submitting = input(false);
  readonly approved = output<AutoQaApplyApprovalRequest>();

  protected readonly operations = OPERATIONS;

  protected readonly approvedBy = signal('');
  protected readonly selectedOperations = signal<ReadonlySet<ApplyOperation>>(new Set());
  protected readonly allowFileUpdate = signal(false);
  protected readonly allowWarnings = signal(false);

  protected readonly canSubmit = computed(
    () => this.approvedBy().trim().length > 0 && this.selectedOperations().size > 0
  );

  onApprovedByChange(value: string): void {
    this.approvedBy.set(value);
  }

  toggleOperation(operation: ApplyOperation, checked: boolean): void {
    const next = new Set(this.selectedOperations());
    if (checked) {
      next.add(operation);
    } else {
      next.delete(operation);
    }
    this.selectedOperations.set(next);
  }

  onSubmit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.approved.emit({
      approvedBy: this.approvedBy().trim(),
      authorizedOperations: Array.from(this.selectedOperations()),
      allowFileUpdate: this.allowFileUpdate(),
      allowWarnings: this.allowWarnings(),
    });
  }
}

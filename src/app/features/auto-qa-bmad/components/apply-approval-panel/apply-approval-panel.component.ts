import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AqbPanelComponent } from '../../../../shared/ui/panel/aqb-panel.component';
import { AqbInputComponent } from '../../../../shared/ui/input/aqb-input.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
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

  /**
   * CREATE/UPDATE/REUSE vêm marcados: são as operações que o plano produz, e
   * começar tudo vazio obrigava a adivinhar quais marcar — errar uma fazia o
   * apply falhar depois de todo o pipeline. NONE fica de fora por não aplicar
   * nada. Sobrescrever arquivo continua exigindo opt-in explícito, mas em
   * allowFileUpdate, que é o campo que de fato libera isso.
   */
  protected readonly selectedOperations = signal<ReadonlySet<ApplyOperation>>(
    new Set<ApplyOperation>(['CREATE', 'UPDATE', 'REUSE'])
  );
  protected readonly allowFileUpdate = signal(false);

  /**
   * Marcado por padrão porque APPROVED_WITH_WARNINGS é o desfecho comum de
   * revisão (quase toda geração traz ao menos um aviso LOW), e sem isto o
   * backend recusa com "exige ApplyApproval.allowWarnings=true" — um erro que
   * só aparecia no fim, sem nada na tela indicando que faltava marcar.
   * Não afrouxa nada: achado CRITICAL/HIGH bloqueia antes, marcado ou não.
   */
  protected readonly allowWarnings = signal(true);

  protected readonly canSubmit = computed(
    () => this.approvedBy().trim().length > 0 && this.selectedOperations().size > 0
  );

  onApprovedByChange(value: string): void {
    this.approvedBy.set(value);
  }

  protected isOperationSelected(operation: ApplyOperation): boolean {
    return this.selectedOperations().has(operation);
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

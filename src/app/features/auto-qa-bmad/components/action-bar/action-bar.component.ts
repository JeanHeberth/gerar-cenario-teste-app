import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AutoQaAvailableAction } from '../../models/auto-qa-enums.model';
import { getActionLabel, getActionVisualKind } from '../../models/auto-qa-action-catalog';

/**
 * Ações com comportamento real definido para além do hint genérico.
 * APPLY/EXECUTE passaram a ser funcionais (com despacho real no state
 * service) na Fase 12.3.5. Na Fase 12.3.7, VIEW_GENERATED_FILES/VIEW_DIFF/
 * VIEW_LOGS/VIEW_LEARNING também passaram a ser funcionais — mas como
 * navegação de UI pura (abrem uma aba do Inspection Panel ou selecionam um
 * stage), nunca chamando service/HttpClient. RETRY continua fora: não há
 * endpoint/contrato público que o suporte.
 */
const FUNCTIONAL_ACTIONS: ReadonlySet<AutoQaAvailableAction> = new Set([
  'START',
  'CONTINUE',
  'GENERATE',
  'CANCEL',
  'APPROVE_FILE_UPDATE',
  'APPROVE_EXECUTION',
  'APPLY',
  'EXECUTE',
  'VIEW_GENERATED_FILES',
  'VIEW_DIFF',
  'VIEW_LOGS',
  'VIEW_LEARNING',
]);

/**
 * Só renderização e emissão de intenção — nunca decide se uma ação é
 * permitida (isso já veio pronto em `availableActions`) e nunca chama
 * service/HttpClient diretamente. `availableActions` é exibida exatamente
 * como o backend devolveu — nunca reordenada, filtrada ou inventada.
 */
@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [AqbLoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-bar.component.html',
  styleUrl: './action-bar.component.scss',
})
export class ActionBarComponent {
  readonly availableActions = input<AutoQaAvailableAction[]>([]);
  readonly pendingAction = input<AutoQaAvailableAction | null>(null);

  readonly actionTriggered = output<AutoQaAvailableAction>();

  protected labelFor(action: AutoQaAvailableAction): string {
    return getActionLabel(action);
  }

  /**
   * Puramente visual (hierarquia/peso do botão) — nunca influencia
   * isDisabled/isFunctional, que continuam vindo exclusivamente de
   * availableActions.
   */
  protected visualKind(action: AutoQaAvailableAction): string {
    return getActionVisualKind(action);
  }

  protected isFunctional(action: AutoQaAvailableAction): boolean {
    return FUNCTIONAL_ACTIONS.has(action);
  }

  protected isDisabled(action: AutoQaAvailableAction): boolean {
    return !this.isFunctional(action) || this.pendingAction() !== null;
  }

  onClick(action: AutoQaAvailableAction): void {
    if (this.isDisabled(action)) {
      return;
    }
    this.actionTriggered.emit(action);
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AutoQaAvailableAction } from '../../models/auto-qa-enums.model';

const ACTION_LABELS: Record<AutoQaAvailableAction, string> = {
  START: 'Iniciar',
  CONTINUE: 'Continuar',
  GENERATE: 'Gerar código',
  APPROVE_FILE_UPDATE: 'Aprovar aplicação de arquivos',
  APPLY: 'Aplicar arquivos',
  APPROVE_EXECUTION: 'Aprovar execução',
  EXECUTE: 'Executar testes',
  CANCEL: 'Cancelar',
  RETRY: 'Tentar novamente',
  VIEW_GENERATED_FILES: 'Ver arquivos gerados',
  VIEW_DIFF: 'Ver diferenças',
  VIEW_LOGS: 'Ver logs',
  VIEW_LEARNING: 'Ver aprendizado',
  NONE: 'Nenhuma ação disponível',
};

/**
 * Ações que já têm despacho real no state service. APPLY/EXECUTE passaram a
 * ser funcionais na Fase 12.3.5. RETRY e as ações de visualização
 * (Preview/Diff/Logs/Learning) continuam fora.
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
    return ACTION_LABELS[action];
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

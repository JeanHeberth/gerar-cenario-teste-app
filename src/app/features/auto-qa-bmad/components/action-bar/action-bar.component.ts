import { ChangeDetectionStrategy, Component, input } from '@angular/core';
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
 * Só renderização. `availableActions` vem exatamente como o backend
 * devolveu — nunca reordenado, filtrado ou inventado. Nesta fase (12.3.2)
 * nenhuma ação é operacional ainda: todo botão nasce desabilitado, com o
 * aviso "Disponível em uma próxima etapa.".
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

  protected labelFor(action: AutoQaAvailableAction): string {
    return ACTION_LABELS[action];
  }
}

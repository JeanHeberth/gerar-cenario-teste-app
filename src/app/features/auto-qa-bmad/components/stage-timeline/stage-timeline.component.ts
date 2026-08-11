import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, computed, input, output } from '@angular/core';
import { StageTimelineItemComponent } from '../stage-timeline-item/stage-timeline-item.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageId, AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { resolveStageVisualState } from '../../shared/utils/resolve-stage-visual-state';

export interface StageTimelineEntry {
  metadata: AutoQaStageMetadata;
  state: StageVisualState;
}

/**
 * Navegação detalhada entre as etapas — distinta do WorkflowOverview
 * (visão compacta). Consome a MESMA StageMetadata e a mesma
 * resolveStageVisualState(), nunca uma segunda máquina de estados. Nunca
 * chama service/HttpClient, nunca altera state, nunca navega sozinha — só
 * emite qual etapa foi selecionada.
 */
@Component({
  selector: 'app-stage-timeline',
  standalone: true,
  imports: [StageTimelineItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stage-timeline.component.html',
  styleUrl: './stage-timeline.component.scss',
})
export class StageTimelineComponent {
  readonly execution = input<AutoQaExecutionResponse | null>(null);
  readonly selectedStage = input<AutoQaStageId | null>(null);

  readonly stageSelected = output<AutoQaStageId>();

  readonly entries = computed<StageTimelineEntry[]>(() => {
    const execution = this.execution();
    return AUTO_QA_STAGE_CATALOG.map((metadata) => ({
      metadata,
      state: resolveStageVisualState(execution, metadata.stage),
    }));
  });

  /**
   * Índice roving-tabbable (Fase 13.8): segue a etapa selecionada; se nada
   * foi explicitamente selecionado (selectedStage null — só ocorre em uso
   * isolado do componente, a página sempre resolve um valor via seu próprio
   * fallback), cai para o primeiro item do catálogo — fallback determinístico,
   * nunca deixa o listbox inteiro sem nenhum item tabbable.
   */
  readonly activeIndex = computed<number>(() => {
    const stage = this.selectedStage();
    const entries = this.entries();
    const idx = stage ? entries.findIndex((entry) => entry.metadata.stage === stage) : -1;
    return idx >= 0 ? idx : 0;
  });

  @ViewChildren(StageTimelineItemComponent) private readonly itemComponents?: QueryList<StageTimelineItemComponent>;

  onSelect(stage: AutoQaStageId): void {
    this.stageSelected.emit(stage);
  }

  /**
   * Navegação do listbox (WAI-ARIA APG): setas movem foco + seleção juntos
   * ("selection follows focus", aprovado na Fase 13.8), Home/End vão direto
   * para as pontas sem wrap. Enter/Space continuam tratados pelo próprio
   * item — aqui só reagimos às teclas de navegação, o resto passa direto.
   */
  onKeydown(event: KeyboardEvent): void {
    const entries = this.entries();
    if (entries.length === 0) {
      return;
    }
    const current = this.activeIndex();
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (current + 1) % entries.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = (current - 1 + entries.length) % entries.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = entries.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.stageSelected.emit(entries[nextIndex].metadata.stage);
    this.itemComponents?.toArray()[nextIndex]?.focus();
  }
}

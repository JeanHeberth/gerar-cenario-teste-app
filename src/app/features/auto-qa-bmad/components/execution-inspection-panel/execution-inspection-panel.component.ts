import { ChangeDetectionStrategy, Component, ElementRef, QueryList, ViewChildren, input, output } from '@angular/core';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { AUTO_QA_INSPECTION_RESOURCE_CATALOG } from '../../models/auto-qa-inspection-resource-catalog';
import { AqbEmptyStateComponent } from '../../../../shared/ui/empty-state/aqb-empty-state.component';
import { ExecutionResultSummaryComponent } from '../execution-result-summary/execution-result-summary.component';

export type InspectionTabId = 'RESUMO' | 'GENERATED_FILES' | 'DIFF' | 'LOGS';

interface InspectionTabDef {
  id: InspectionTabId;
  label: string;
  icon: 'clipboard-list' | 'file-text' | 'code' | 'file-check';
}

const TABS: InspectionTabDef[] = [
  { id: 'RESUMO', label: 'Resumo', icon: 'clipboard-list' },
  { id: 'GENERATED_FILES', label: AUTO_QA_INSPECTION_RESOURCE_CATALOG.GENERATED_FILES.label, icon: 'file-text' },
  { id: 'DIFF', label: AUTO_QA_INSPECTION_RESOURCE_CATALOG.DIFF.label, icon: 'code' },
  { id: 'LOGS', label: AUTO_QA_INSPECTION_RESOURCE_CATALOG.LOGS.label, icon: 'file-check' },
];

/**
 * Centraliza visualmente os recursos de inspeção da execução — não cria
 * nenhum dado, apenas apresenta o que já está disponível (aba Resumo,
 * reaproveitando ExecutionResultSummaryComponent sem duplicar sua lógica)
 * ou comunica indisponibilidade controlada (Artefatos/Diff/Logs, sempre
 * UNAVAILABLE no contrato atual — sem loading, sem mock, sem HTTP). A aba
 * selecionada é estado de UI puro, controlado externamente pelo consumidor
 * (input `selected` + output `selectedChange`), o mesmo padrão já usado
 * por StageTimeline/ActionBar nesta feature.
 */
@Component({
  selector: 'app-execution-inspection-panel',
  standalone: true,
  imports: [AqbEmptyStateComponent, ExecutionResultSummaryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-inspection-panel.component.html',
  styleUrl: './execution-inspection-panel.component.scss',
})
export class ExecutionInspectionPanelComponent {
  readonly execution = input.required<AutoQaExecutionResponse>();
  readonly selected = input<InspectionTabId>('RESUMO');
  readonly selectedChange = output<InspectionTabId>();

  protected readonly tabs = TABS;

  protected readonly generatedFilesUnavailableMessage =
    AUTO_QA_INSPECTION_RESOURCE_CATALOG.GENERATED_FILES.unavailableMessage ?? '';
  protected readonly diffUnavailableMessage = AUTO_QA_INSPECTION_RESOURCE_CATALOG.DIFF.unavailableMessage ?? '';
  protected readonly logsUnavailableMessage = AUTO_QA_INSPECTION_RESOURCE_CATALOG.LOGS.unavailableMessage ?? '';

  @ViewChildren('tabButton') private readonly tabButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  selectTab(id: InspectionTabId): void {
    this.selectedChange.emit(id);
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const buttons = this.tabButtons?.toArray() ?? [];
    if (buttons.length === 0) {
      return;
    }
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + delta + this.tabs.length) % this.tabs.length;
    buttons[nextIndex].nativeElement.focus();
    this.selectedChange.emit(this.tabs[nextIndex].id);
  }
}

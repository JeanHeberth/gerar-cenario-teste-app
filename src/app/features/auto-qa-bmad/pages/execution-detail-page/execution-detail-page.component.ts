import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../shared/ui/page-header/aqb-page-header.component';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';
import { AqbStatusChipComponent } from '../../shared/ui/status-chip/aqb-status-chip.component';
import { WorkflowOverviewComponent } from '../../components/workflow-overview/workflow-overview.component';
import { StageTimelineComponent } from '../../components/stage-timeline/stage-timeline.component';
import { StageDetailPanelComponent } from '../../components/stage-detail-panel/stage-detail-panel.component';
import { ExecutionSummaryComponent } from '../../components/execution-summary/execution-summary.component';
import { WarningListComponent } from '../../components/warning-list/warning-list.component';
import { ErrorListComponent } from '../../components/error-list/error-list.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageId, getStageMetadata } from '../../models/auto-qa-stage-catalog';
import { resolveStageVisualState } from '../../shared/utils/resolve-stage-visual-state';

/**
 * Página smart de detalhe de uma execução. Nesta fase (12.3.3) adiciona a
 * Timeline interativa e o painel de detalhe por etapa. `selectedStage` é
 * estado exclusivamente de UI (não vai para o AutoQaExecutionStateService):
 * nunca chama API, nunca altera o backend, só decide o que o painel
 * mostra.
 */
@Component({
  selector: 'app-execution-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    AqbPageHeaderComponent,
    AqbLoadingComponent,
    AqbButtonComponent,
    AqbStatusChipComponent,
    WorkflowOverviewComponent,
    StageTimelineComponent,
    StageDetailPanelComponent,
    ExecutionSummaryComponent,
    WarningListComponent,
    ErrorListComponent,
    ActionBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-detail-page.component.html',
  styleUrl: './execution-detail-page.component.scss',
})
export class ExecutionDetailPageComponent implements OnInit {
  protected readonly state = inject(AutoQaExecutionStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _selectedStage = signal<AutoQaStageId | null>(null);

  /** Seleção efetiva: escolha explícita do usuário, com fallback currentStage → lastStageCompleted → primeira etapa do catálogo. */
  protected readonly selectedStage = computed<AutoQaStageId>(() => {
    const explicit = this._selectedStage();
    if (explicit) {
      return explicit;
    }
    const execution = this.state.current();
    return execution?.currentStage ?? execution?.lastStageCompleted ?? AUTO_QA_STAGE_CATALOG[0].stage;
  });

  protected readonly selectedStageMetadata = computed(() => getStageMetadata(this.selectedStage()));
  protected readonly selectedStageVisualState = computed(() =>
    resolveStageVisualState(this.state.current(), this.selectedStage())
  );

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const executionId = params.get('executionId');
      if (executionId) {
        this.state.loadExecution(executionId);
      }
    });
  }

  onStageSelected(stage: AutoQaStageId): void {
    this._selectedStage.set(stage);
  }

  onRefresh(): void {
    const executionId = this.state.selectedExecutionId();
    if (executionId) {
      this.state.loadExecution(executionId);
    }
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
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
import { CancelConfirmModalComponent } from '../../components/cancel-confirm-modal/cancel-confirm-modal.component';
import { ApplyApprovalPanelComponent } from '../../components/apply-approval-panel/apply-approval-panel.component';
import { ExecutionApprovalPanelComponent } from '../../components/execution-approval-panel/execution-approval-panel.component';
import { AUTO_QA_STAGE_CATALOG, AutoQaStageId, getStageMetadata } from '../../models/auto-qa-stage-catalog';
import { resolveStageVisualState } from '../../shared/utils/resolve-stage-visual-state';
import { AutoQaAvailableAction } from '../../models/auto-qa-enums.model';
import {
  AutoQaApplyApprovalRequest,
  AutoQaExecutionApprovalRequest,
  AutoQaExecutionResponse,
} from '../../models/auto-qa-execution.model';

/**
 * Página smart de detalhe de uma execução. A partir da Fase 12.3.4, ações
 * funcionais (START/CONTINUE/GENERATE/CANCEL/APPROVE_FILE_UPDATE/
 * APPROVE_EXECUTION) são despachadas por aqui — a ActionBar só emite a
 * intenção, quem decide abrir modal/painel ou disparar direto é esta
 * página. `selectedStage`/`showCancelModal`/`showApplyApprovalPanel`/
 * `showExecutionApprovalPanel` são estado exclusivamente de UI (não vão
 * para o AutoQaExecutionStateService).
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
    CancelConfirmModalComponent,
    ApplyApprovalPanelComponent,
    ExecutionApprovalPanelComponent,
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
  protected readonly showCancelModal = signal(false);
  protected readonly showApplyApprovalPanel = signal(false);
  protected readonly showExecutionApprovalPanel = signal(false);

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

  onActionTriggered(action: AutoQaAvailableAction): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    switch (action) {
      case 'START':
        this.dispatch(this.state.start(executionId));
        break;
      case 'CONTINUE':
        this.dispatch(this.state.continueExecution(executionId));
        break;
      case 'GENERATE':
        this.dispatch(this.state.generate(executionId));
        break;
      case 'CANCEL':
        this.showCancelModal.set(true);
        break;
      case 'APPROVE_FILE_UPDATE':
        this.showApplyApprovalPanel.set(true);
        break;
      case 'APPROVE_EXECUTION':
        this.showExecutionApprovalPanel.set(true);
        break;
      default:
        // Ação ainda não suportada — a ActionBar já a mantém desabilitada,
        // não deveria emitir actionTriggered para ela.
        break;
    }
  }

  onCancelConfirmed(reason: string | undefined): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    this.showCancelModal.set(false);
    this.dispatch(this.state.cancel(executionId, reason));
  }

  onCancelDismissed(): void {
    this.showCancelModal.set(false);
  }

  onApplyApproved(request: AutoQaApplyApprovalRequest): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    this.showApplyApprovalPanel.set(false);
    this.dispatch(this.state.approveFileUpdate(executionId, request));
  }

  onExecutionApproved(request: AutoQaExecutionApprovalRequest): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    this.showExecutionApprovalPanel.set(false);
    this.dispatch(this.state.approveExecution(executionId, request));
  }

  private dispatch(action$: Observable<AutoQaExecutionResponse>): void {
    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        // erro já refletido em state.actionError(); nada mais a fazer aqui.
      },
    });
  }
}

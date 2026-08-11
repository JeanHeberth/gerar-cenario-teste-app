import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../shared/ui/page-header/aqb-page-header.component';
import { AqbSkeletonComponent } from '../../shared/ui/skeleton/aqb-skeleton.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';
import { AqbStatusChipComponent } from '../../shared/ui/status-chip/aqb-status-chip.component';
import { WorkflowOverviewComponent } from '../../components/workflow-overview/workflow-overview.component';
import { StageTimelineComponent } from '../../components/stage-timeline/stage-timeline.component';
import { StageDetailPanelComponent } from '../../components/stage-detail-panel/stage-detail-panel.component';
import { ExecutionSummaryComponent } from '../../components/execution-summary/execution-summary.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';
import { ExecutionStatusHeaderComponent } from '../../components/execution-status-header/execution-status-header.component';
import {
  ExecutionInspectionPanelComponent,
  InspectionTabId,
} from '../../components/execution-inspection-panel/execution-inspection-panel.component';
import { CancelConfirmModalComponent } from '../../components/cancel-confirm-modal/cancel-confirm-modal.component';
import { ApplyConfirmModalComponent } from '../../components/apply-confirm-modal/apply-confirm-modal.component';
import { ExecuteConfirmModalComponent } from '../../components/execute-confirm-modal/execute-confirm-modal.component';
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
    AqbSkeletonComponent,
    AqbButtonComponent,
    AqbStatusChipComponent,
    WorkflowOverviewComponent,
    StageTimelineComponent,
    StageDetailPanelComponent,
    ExecutionSummaryComponent,
    ActionBarComponent,
    ExecutionStatusHeaderComponent,
    ExecutionInspectionPanelComponent,
    CancelConfirmModalComponent,
    ApplyApprovalPanelComponent,
    ExecutionApprovalPanelComponent,
    // confirmation modals for sensitive actions
    ApplyConfirmModalComponent,
    ExecuteConfirmModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-detail-page.component.html',
  styleUrl: './execution-detail-page.component.scss',
})
export class ExecutionDetailPageComponent implements OnInit {
  protected readonly state = inject(AutoQaExecutionStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // Fase 13.7/M4: guardado a partir da rota independentemente de o
  // carregamento ter tido sucesso — diferente de state.selectedExecutionId(),
  // que só é setado DENTRO do next() de loadExecution (nunca em falha), então
  // não serviria para retry após uma falha de carregamento inicial.
  protected readonly executionId = signal<string | null>(null);

  private readonly _selectedStage = signal<AutoQaStageId | null>(null);
  protected readonly showCancelModal = signal(false);
  protected readonly showApplyApprovalPanel = signal(false);
  protected readonly showExecutionApprovalPanel = signal(false);
  protected readonly showApplyConfirm = signal(false);
  protected readonly showExecuteConfirm = signal(false);

  /** Aba selecionada do Inspection Panel — estado de UI puro, nunca vai para o state service. */
  protected readonly selectedInspectionResource = signal<InspectionTabId>('RESUMO');

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
      this.executionId.set(executionId);
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

  /**
   * Fase 13.7/M4: retry manual para quando o carregamento inicial falha
   * antes de current() existir — nesse caso "Atualizar" (que só aparece
   * dentro do cabeçalho, renderizado apenas com current() já presente)
   * nunca fica visível. Reutiliza loadExecution (mesmo guard interno contra
   * chamada duplicada enquanto loading() já está ativo) — nenhum endpoint
   * novo, nenhuma lógica HTTP duplicada.
   */
  onRetryLoad(): void {
    const executionId = this.executionId();
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
      case 'APPLY':
        this.showApplyConfirm.set(true);
        break;
      case 'EXECUTE':
        this.showExecuteConfirm.set(true);
        break;
      case 'VIEW_GENERATED_FILES':
        // Navegação de UI pura — abre a aba correspondente do Inspection
        // Panel. Nenhuma chamada HTTP: o recurso é UNAVAILABLE no contrato
        // atual, e o próprio painel comunica isso.
        this.selectedInspectionResource.set('GENERATED_FILES');
        break;
      case 'VIEW_DIFF':
        this.selectedInspectionResource.set('DIFF');
        break;
      case 'VIEW_LOGS':
        this.selectedInspectionResource.set('LOGS');
        break;
      case 'VIEW_LEARNING':
        // Também navegação de UI pura — reaproveita a seleção de etapa já
        // existente para apontar o StageDetailPanel para LEARNING.
        this._selectedStage.set('LEARNING');
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

  // Apply confirmation modal handlers
  onApplyConfirmed(): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    this.showApplyConfirm.set(false);
    this.dispatch(this.state.apply(executionId));
  }

  onApplyDismissed(): void {
    this.showApplyConfirm.set(false);
  }

  // Execute confirmation modal handlers
  onExecuteConfirmed(): void {
    const executionId = this.state.selectedExecutionId();
    if (!executionId) {
      return;
    }
    this.showExecuteConfirm.set(false);
    this.dispatch(this.state.execute(executionId));
  }

  onExecuteDismissed(): void {
    this.showExecuteConfirm.set(false);
  }

  private dispatch(action$: Observable<AutoQaExecutionResponse>): void {
    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => {
        // erro já refletido em state.actionError(); nada mais a fazer aqui.
      },
    });
  }
}

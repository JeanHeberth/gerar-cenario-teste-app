import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../shared/ui/page-header/aqb-page-header.component';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AqbButtonComponent } from '../../shared/ui/button/aqb-button.component';
import { AqbStatusChipComponent } from '../../shared/ui/status-chip/aqb-status-chip.component';
import { WorkflowOverviewComponent } from '../../components/workflow-overview/workflow-overview.component';
import { ExecutionSummaryComponent } from '../../components/execution-summary/execution-summary.component';
import { WarningListComponent } from '../../components/warning-list/warning-list.component';
import { ErrorListComponent } from '../../components/error-list/error-list.component';
import { ActionBarComponent } from '../../components/action-bar/action-bar.component';

/**
 * Página smart de detalhe de uma execução. Nesta fase (12.3.2) só lê
 * (GET /{id}) — nenhuma aprovação/execução real ainda, a ActionBar mostra
 * as ações do backend só como referência, todas desabilitadas.
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

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const executionId = params.get('executionId');
      if (executionId) {
        this.state.loadExecution(executionId);
      }
    });
  }

  onRefresh(): void {
    const executionId = this.state.selectedExecutionId();
    if (executionId) {
      this.state.loadExecution(executionId);
    }
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../shared/ui/page-header/aqb-page-header.component';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AqbBadgeComponent } from '../../shared/ui/badge/aqb-badge.component';
import { WorkflowOverviewComponent } from '../../components/workflow-overview/workflow-overview.component';

/**
 * Página smart de detalhe de uma execução. Nesta fase (12.3.1) só lê
 * (GET /{id}) e mostra o WorkflowOverview estático — sem ações de
 * aprovação/execução/cancelamento, que ficam para as próximas subfases.
 */
@Component({
  selector: 'app-execution-detail-page',
  standalone: true,
  imports: [AqbPageHeaderComponent, AqbLoadingComponent, AqbBadgeComponent, WorkflowOverviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-detail-page.component.html',
  styleUrl: './execution-detail-page.component.scss',
})
export class ExecutionDetailPageComponent implements OnInit {
  protected readonly state = inject(AutoQaExecutionStateService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const executionId = params.get('executionId');
      if (executionId) {
        this.state.loadExecution(executionId);
      }
    });
  }
}

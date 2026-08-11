import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../../../shared/ui/page-header/aqb-page-header.component';
import { AqbSkeletonComponent } from '../../../../shared/ui/skeleton/aqb-skeleton.component';
import { AqbEmptyStateComponent } from '../../../../shared/ui/empty-state/aqb-empty-state.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { NewExecutionFormComponent, NewExecutionFormValue } from '../../components/new-execution-form/new-execution-form.component';
import { ExecutionCardComponent } from '../../components/execution-card/execution-card.component';

/**
 * Página smart: injeta o state service, orquestra carregamento, criação e
 * paginação. Nesta fase (12.3.2) só consome POST/GET /executions — nenhuma
 * ação operacional do workflow.
 */
@Component({
  selector: 'app-execution-list-page',
  standalone: true,
  imports: [
    RouterLink,
    AqbPageHeaderComponent,
    AqbSkeletonComponent,
    AqbEmptyStateComponent,
    AqbButtonComponent,
    NewExecutionFormComponent,
    ExecutionCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-list-page.component.html',
  styleUrl: './execution-list-page.component.scss',
})
export class ExecutionListPageComponent implements OnInit {
  protected readonly state = inject(AutoQaExecutionStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canGoPrevious = computed(() => this.state.pagination().page > 0);
  protected readonly canGoNext = computed(() => {
    const { page, size, totalElements } = this.state.pagination();
    return (page + 1) * size < totalElements;
  });

  ngOnInit(): void {
    this.state.loadList(0, 20);
  }

  onCreate(value: NewExecutionFormValue): void {
    this.state
      .createExecution(value.scenario, value.projectPath)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.router.navigate([created.executionId], { relativeTo: this.route });
        },
        error: () => {
          // erro já refletido em state.error(); nada mais a fazer aqui.
        },
      });
  }

  goToPreviousPage(): void {
    const { page, size } = this.state.pagination();
    this.state.loadList(page - 1, size);
  }

  goToNextPage(): void {
    const { page, size } = this.state.pagination();
    this.state.loadList(page + 1, size);
  }

  onRetryList(): void {
    const { page, size } = this.state.pagination();
    this.state.loadList(page, size);
  }
}

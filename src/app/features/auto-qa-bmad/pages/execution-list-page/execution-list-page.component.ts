import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../shared/ui/page-header/aqb-page-header.component';
import { AqbCardComponent } from '../../shared/ui/card/aqb-card.component';
import { AqbBadgeComponent } from '../../shared/ui/badge/aqb-badge.component';
import { AqbLoadingComponent } from '../../shared/ui/loading/aqb-loading.component';
import { AqbEmptyStateComponent } from '../../shared/ui/empty-state/aqb-empty-state.component';

/**
 * Página smart: injeta o state service e orquestra o carregamento da
 * primeira página de execuções. Nesta fase (12.3.1) é só leitura — nenhuma
 * ação de criação/aprovação/execução aqui ainda.
 */
@Component({
  selector: 'app-execution-list-page',
  standalone: true,
  imports: [RouterLink, AqbPageHeaderComponent, AqbCardComponent, AqbBadgeComponent, AqbLoadingComponent, AqbEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './execution-list-page.component.html',
  styleUrl: './execution-list-page.component.scss',
})
export class ExecutionListPageComponent implements OnInit {
  protected readonly state = inject(AutoQaExecutionStateService);

  ngOnInit(): void {
    this.state.loadList(0, 20);
  }
}

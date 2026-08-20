import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AutoQaExecutionStateService } from '../../state/auto-qa-execution-state.service';
import { AqbPageHeaderComponent } from '../../../../shared/ui/page-header/aqb-page-header.component';
import { AqbSkeletonComponent } from '../../../../shared/ui/skeleton/aqb-skeleton.component';
import { AqbEmptyStateComponent } from '../../../../shared/ui/empty-state/aqb-empty-state.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { NewExecutionFormComponent, NewExecutionFormValue } from '../../components/new-execution-form/new-execution-form.component';
import { ExecutionCardComponent } from '../../components/execution-card/execution-card.component';
import { FolderPickerModalComponent } from '../../components/folder-picker-modal/folder-picker-modal.component';
import { AutoQaPastasService } from '../../services/auto-qa-pastas.service';
import { AutoQaCapabilitiesService, FrameworkOption } from '../../services/auto-qa-capabilities.service';
import { NavegacaoPastas } from '../../models/auto-qa-pastas.model';

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
    FolderPickerModalComponent,
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
  private readonly pastasService = inject(AutoQaPastasService);
  private readonly capabilitiesService = inject(AutoQaCapabilitiesService);

  /**
   * Matriz framework → canais, buscada aqui porque o formulário é
   * apresentacional. Vazia até responder: os selects caem em "Detectar pelo
   * projeto", que é justamente o padrão.
   */
  protected readonly frameworks = signal<FrameworkOption[]>([]);

  // Seletor de pastas: a página é quem busca, porque o formulário e o modal
  // são apresentacionais e não falam com HttpClient.
  protected readonly seletorAberto = signal(false);
  protected readonly seletorCarregando = signal(false);
  protected readonly seletorErro = signal('');
  protected readonly seletorNivel = signal<NavegacaoPastas | null>(null);
  private readonly formulario = viewChild(NewExecutionFormComponent);

  // Cenário vindo da Lista de Cenários (?cenarioId=...&cenarioTitulo=...).
  protected readonly cenarioSelecionadoId = signal<string | null>(null);
  protected readonly cenarioSelecionadoTitulo = signal<string | null>(null);

  protected readonly canGoPrevious = computed(() => this.state.pagination().page > 0);
  protected readonly canGoNext = computed(() => {
    const { page, size, totalElements } = this.state.pagination();
    return (page + 1) * size < totalElements;
  });

  ngOnInit(): void {
    this.state.loadList(0, 20);

    this.capabilitiesService
      .listarFrameworks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opcoes) => this.frameworks.set(opcoes),
        // Falhar aqui não impede criar execução: sem a matriz os selects ficam
        // só com "Detectar pelo projeto", que é o comportamento anterior.
        error: () => this.frameworks.set([]),
      });

    // Chegada a partir da Lista de Cenários: o cenário já escolhido vem por
    // query param, para o usuário só apontar a pasta e disparar.
    const params = this.route.snapshot.queryParamMap;
    this.cenarioSelecionadoId.set(params.get('cenarioId'));
    this.cenarioSelecionadoTitulo.set(params.get('cenarioTitulo'));
  }

  onCreate(value: NewExecutionFormValue): void {
    // Uma origem OU a outra: o backend recusa as duas juntas.
    const origem = value.cenarioId ? { cenarioId: value.cenarioId } : { scenario: value.scenario };
    this.state
      .createExecution(origem, value.projectPath, value.automationType, value.automationFramework)
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

  // --- Seletor de pasta do projeto ---

  protected onAbrirSeletorDePasta(): void {
    this.seletorAberto.set(true);
    // Sempre reabre nas raízes autorizadas: manter o último nível visitado
    // faria o modal mostrar uma pasta que pode nem existir mais.
    this.carregarPastas(null);
  }

  protected onNavegarPastas(caminho: string | null): void {
    this.carregarPastas(caminho);
  }

  protected onSelecionarPasta(caminho: string): void {
    this.formulario()?.definirProjectPath(caminho);
    this.fecharSeletor();
  }

  protected onFecharSeletor(): void {
    this.fecharSeletor();
  }

  private fecharSeletor(): void {
    this.seletorAberto.set(false);
    this.seletorErro.set('');
  }

  private carregarPastas(caminho: string | null): void {
    this.seletorCarregando.set(true);
    this.seletorErro.set('');

    this.pastasService
      .listar(caminho)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nivel) => {
          this.seletorNivel.set(nivel);
          this.seletorCarregando.set(false);
        },
        error: () => {
          // Mantém o nível anterior na tela: esvaziar a lista faria parecer
          // que a pasta não tem conteúdo, e não que a consulta falhou.
          this.seletorErro.set('Não foi possível listar as pastas. Verifique se a API está acessível.');
          this.seletorCarregando.set(false);
        },
      });
  }
}

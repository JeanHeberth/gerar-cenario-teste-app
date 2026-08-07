import { Injectable, computed, inject, signal } from '@angular/core';
import { AutoQaExecutionService } from '../services/auto-qa-execution.service';
import { AutoQaExecutionResponse } from '../models/auto-qa-execution.model';

/**
 * Única fonte de verdade de estado da feature Auto QA BMAD (Signals, sem
 * NgRx). Nesta fase (12.3.1) só o lado de leitura está ativo — loadList()
 * e loadExecution() — porque não há ainda nenhuma UI que dispare ações de
 * escrita (aprovação/execução ficam para as próximas subfases). Nunca
 * recalcula status/stage: só armazena o que o backend devolveu.
 */
@Injectable({ providedIn: 'root' })
export class AutoQaExecutionStateService {
  private readonly executionService = inject(AutoQaExecutionService);

  private readonly _current = signal<AutoQaExecutionResponse | null>(null);
  private readonly _list = signal<AutoQaExecutionResponse[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly current = this._current.asReadonly();
  readonly list = this._list.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isTerminal = computed(() => {
    const status = this._current()?.status;
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
  });

  loadList(page: number, size: number): void {
    this._loading.set(true);
    this._error.set(null);
    this.executionService.list(page, size).subscribe({
      next: (response) => {
        this._list.set(response.items);
        this._loading.set(false);
      },
      error: () => {
        this._error.set('Não foi possível carregar a lista de execuções.');
        this._loading.set(false);
      },
    });
  }

  loadExecution(executionId: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.executionService.get(executionId).subscribe({
      next: (response) => {
        this._current.set(response);
        this._loading.set(false);
      },
      error: () => {
        this._error.set('Não foi possível carregar a execução.');
        this._loading.set(false);
      },
    });
  }
}

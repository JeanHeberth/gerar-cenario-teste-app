import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, finalize, tap } from 'rxjs';
import { AutoQaExecutionService } from '../services/auto-qa-execution.service';
import {
  AutoQaApplyApprovalRequest,
  AutoQaExecutionApprovalRequest,
  AutoQaExecutionResponse,
} from '../models/auto-qa-execution.model';
import { AutoQaAvailableAction } from '../models/auto-qa-enums.model';
import { mapHttpErrorToUiError } from '../shared/utils/auto-qa-error-mapper';

export interface AutoQaPagination {
  page: number;
  size: number;
  totalElements: number;
}

/**
 * Única fonte de verdade de estado da feature Auto QA BMAD (Signals, sem
 * NgRx). Nunca recalcula AutoQaWorkflowStatus/availableActions — só
 * armazena exatamente o AutoQaExecutionResponse recebido do backend. Cada
 * método de carregamento ignora uma nova chamada enquanto a anterior ainda
 * está em andamento (evita requisições duplicadas). Não usa polling nem
 * effect() para disparar chamadas HTTP automaticamente.
 */
@Injectable({ providedIn: 'root' })
export class AutoQaExecutionStateService {
  private readonly executionService = inject(AutoQaExecutionService);

  private readonly _current = signal<AutoQaExecutionResponse | null>(null);
  private readonly _list = signal<AutoQaExecutionResponse[]>([]);
  private readonly _loading = signal(false);
  private readonly _creating = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _pagination = signal<AutoQaPagination>({ page: 0, size: 20, totalElements: 0 });
  private readonly _selectedExecutionId = signal<string | null>(null);
  private readonly _pendingAction = signal<AutoQaAvailableAction | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly current = this._current.asReadonly();
  readonly list = this._list.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly creating = this._creating.asReadonly();
  readonly error = this._error.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly selectedExecutionId = this._selectedExecutionId.asReadonly();
  readonly pendingAction = this._pendingAction.asReadonly();
  readonly actionError = this._actionError.asReadonly();

  readonly hasExecutions = computed(() => this._list().length > 0);
  readonly hasCurrentExecution = computed(() => this._current() !== null);
  readonly currentWarnings = computed(() => this._current()?.warnings ?? []);
  readonly currentErrors = computed(() => this._current()?.errors ?? []);
  readonly currentAvailableActions = computed(() => this._current()?.availableActions ?? []);
  readonly canRefresh = computed(() => this.hasCurrentExecution() && !this._loading());

  readonly isTerminal = computed(() => {
    const status = this._current()?.status;
    return status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';
  });

  loadList(page: number, size: number): void {
    if (this._loading()) {
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    this.executionService
      .list(page, size)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (response) => {
          this._list.set(response.items);
          this._pagination.set({ page: response.page, size: response.size, totalElements: response.totalElements });
        },
        error: (err: HttpErrorResponse) => {
          this._error.set(mapHttpErrorToUiError(err).message);
        },
      });
  }

  loadExecution(executionId: string): void {
    if (this._loading()) {
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    this.executionService
      .get(executionId)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (response) => {
          this._current.set(response);
          this._selectedExecutionId.set(executionId);
        },
        error: (err: HttpErrorResponse) => {
          this._error.set(mapHttpErrorToUiError(err).message);
        },
      });
  }

  createExecution(scenario: string, projectPath: string): Observable<AutoQaExecutionResponse> {
    if (this._creating()) {
      return EMPTY;
    }
    this._creating.set(true);
    this._error.set(null);
    return this.executionService.create(scenario, projectPath).pipe(
      tap((response) => this._current.set(response)),
      tap({
        error: (err: HttpErrorResponse) => this._error.set(mapHttpErrorToUiError(err).message),
      }),
      finalize(() => this._creating.set(false))
    );
  }

  start(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.dispatch('START', () => this.executionService.start(executionId));
  }

  continueExecution(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.dispatch('CONTINUE', () => this.executionService.continueExecution(executionId));
  }

  generate(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.dispatch('GENERATE', () => this.executionService.generate(executionId));
  }

  cancel(executionId: string, reason?: string): Observable<AutoQaExecutionResponse> {
    return this.dispatch('CANCEL', () => this.executionService.cancel(executionId, reason));
  }

  approveFileUpdate(executionId: string, request: AutoQaApplyApprovalRequest): Observable<AutoQaExecutionResponse> {
    return this.dispatch('APPROVE_FILE_UPDATE', () => this.executionService.registerApplyApproval(executionId, request));
  }

  approveExecution(
    executionId: string,
    request: AutoQaExecutionApprovalRequest
  ): Observable<AutoQaExecutionResponse> {
    return this.dispatch('APPROVE_EXECUTION', () => this.executionService.registerExecutionApproval(executionId, request));
  }

  /**
   * Ponto único de despacho de ações do workflow. Ignora uma nova ação
   * enquanto outra ainda está em andamento (guard entre ações diferentes,
   * não só dentro da mesma). Sempre atualiza current() com a resposta
   * autoritativa do backend — nunca recalcula status/availableActions.
   */
  private dispatch(
    action: AutoQaAvailableAction,
    call: () => Observable<AutoQaExecutionResponse>
  ): Observable<AutoQaExecutionResponse> {
    if (this._pendingAction()) {
      return EMPTY;
    }
    this._pendingAction.set(action);
    this._actionError.set(null);
    return call().pipe(
      tap((response) => this._current.set(response)),
      tap({
        error: (err: HttpErrorResponse) => this._actionError.set(mapHttpErrorToUiError(err).message),
      }),
      finalize(() => this._pendingAction.set(null))
    );
  }
}

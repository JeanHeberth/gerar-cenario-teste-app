import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../enviroment/enviroment.prd';
import {
  AutoQaApplyApprovalRequest,
  AutoQaExecutionApprovalRequest,
  AutoQaExecutionListResponse,
  AutoQaExecutionResponse,
} from '../models/auto-qa-execution.model';

/**
 * Nenhuma chamada HTTP desta feature pode ficar pendente indefinidamente
 * (Fase 13.7/M1) — sem isso, uma requisição que nunca recebe resposta
 * mantinha `loading`/`creating`/`pendingAction` presos para sempre, sem
 * nenhum erro visível ao usuário.
 */
export const AUTO_QA_HTTP_TIMEOUT_MS = 30_000;

/**
 * Espelha 1:1 os endpoints de AutoQaExecutionController
 * (`/api/auto-qa/executions`). Sem lógica além de montar URL/corpo (e do
 * timeout uniforme abaixo) — nenhuma regra de negócio, nenhuma decisão
 * sobre ações permitidas.
 */
@Injectable({ providedIn: 'root' })
export class AutoQaExecutionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auto-qa/executions`;

  create(scenario: string, projectPath: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(this.baseUrl, { scenario, projectPath }));
  }

  list(page: number, size: number): Observable<AutoQaExecutionListResponse> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.withTimeout(this.http.get<AutoQaExecutionListResponse>(this.baseUrl, { params }));
  }

  get(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.get<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}`));
  }

  start(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/start`, {}));
  }

  continueExecution(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/continue`, {}));
  }

  generate(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/generate`, {}));
  }

  registerApplyApproval(
    executionId: string,
    request: AutoQaApplyApprovalRequest
  ): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(
      this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/apply-approval`, request)
    );
  }

  apply(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/apply`, {}));
  }

  registerExecutionApproval(
    executionId: string,
    request: AutoQaExecutionApprovalRequest
  ): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(
      this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/execution-approval`, request)
    );
  }

  execute(executionId: string): Observable<AutoQaExecutionResponse> {
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/execute`, {}));
  }

  cancel(executionId: string, reason?: string): Observable<AutoQaExecutionResponse> {
    const body = reason ? { reason } : {};
    return this.withTimeout(this.http.post<AutoQaExecutionResponse>(`${this.baseUrl}/${executionId}/cancel`, body));
  }

  private withTimeout<T>(source: Observable<T>): Observable<T> {
    return source.pipe(timeout(AUTO_QA_HTTP_TIMEOUT_MS));
  }
}

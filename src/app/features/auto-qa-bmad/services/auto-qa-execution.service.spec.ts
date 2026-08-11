import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimeoutError } from 'rxjs';
import { AUTO_QA_HTTP_TIMEOUT_MS, AutoQaExecutionService } from './auto-qa-execution.service';
import { environment } from '../../../enviroment/enviroment.prd';
import { AutoQaExecutionResponse } from '../models/auto-qa-execution.model';

describe('AutoQaExecutionService', () => {
  let service: AutoQaExecutionService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/auto-qa/executions`;

  const sampleResponse: AutoQaExecutionResponse = {
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'CREATED',
    currentStage: null,
    lastStageStarted: null,
    lastStageCompleted: null,
    attempt: 0,
    progress: 0,
    availableActions: ['START'],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AutoQaExecutionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AutoQaExecutionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('create() faz POST em /executions com scenario e projectPath', () => {
    service.create('Login com credenciais válidas', '/tmp/projeto').subscribe((resp) => {
      expect(resp).toEqual(sampleResponse);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ scenario: 'Login com credenciais válidas', projectPath: '/tmp/projeto' });
    req.flush(sampleResponse);
  });

  it('list() faz GET em /executions com page e size', () => {
    const listResponse = { items: [sampleResponse], page: 0, size: 20, totalElements: 1 };
    service.list(0, 20).subscribe((resp) => {
      expect(resp).toEqual(listResponse);
    });

    const req = httpMock.expectOne((r) => r.url === baseUrl && r.params.get('page') === '0' && r.params.get('size') === '20');
    expect(req.request.method).toBe('GET');
    req.flush(listResponse);
  });

  it('get() faz GET em /executions/{id}', () => {
    service.get('exec-1').subscribe((resp) => {
      expect(resp).toEqual(sampleResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/exec-1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleResponse);
  });

  it('start() faz POST em /executions/{id}/start sem corpo', () => {
    service.start('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/start`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(sampleResponse);
  });

  it('continueExecution() faz POST em /executions/{id}/continue', () => {
    service.continueExecution('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/continue`);
    expect(req.request.method).toBe('POST');
    req.flush(sampleResponse);
  });

  it('generate() faz POST em /executions/{id}/generate', () => {
    service.generate('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/generate`);
    expect(req.request.method).toBe('POST');
    req.flush(sampleResponse);
  });

  it('registerApplyApproval() faz POST em /executions/{id}/apply-approval com o corpo da aprovação', () => {
    const request = {
      approvedBy: 'jean',
      authorizedOperations: ['CREATE' as const],
      allowFileUpdate: true,
      allowWarnings: false,
    };
    service.registerApplyApproval('exec-1', request).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/apply-approval`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(sampleResponse);
  });

  it('apply() faz POST em /executions/{id}/apply', () => {
    service.apply('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/apply`);
    expect(req.request.method).toBe('POST');
    req.flush(sampleResponse);
  });

  it('registerExecutionApproval() faz POST em /executions/{id}/execution-approval com o corpo da aprovação', () => {
    const request = {
      approvedBy: 'jean',
      allowedCommands: ['NPM_TEST' as const],
      allowTestExecution: true,
      allowInstallCommand: false,
      allowBuildCommand: false,
    };
    service.registerExecutionApproval('exec-1', request).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/execution-approval`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(sampleResponse);
  });

  it('execute() faz POST em /executions/{id}/execute', () => {
    service.execute('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/execute`);
    expect(req.request.method).toBe('POST');
    req.flush(sampleResponse);
  });

  it('cancel() sem motivo faz POST em /executions/{id}/cancel com corpo vazio', () => {
    service.cancel('exec-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/cancel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(sampleResponse);
  });

  it('cancel() com motivo envia { reason } no corpo', () => {
    service.cancel('exec-1', 'Cancelado pelo usuário').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/exec-1/cancel`);
    expect(req.request.body).toEqual({ reason: 'Cancelado pelo usuário' });
    req.flush(sampleResponse);
  });

  it('get() propaga erro 404 quando a execução não existe', () => {
    let capturedStatus: number | undefined;
    service.get('inexistente').subscribe({
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${baseUrl}/inexistente`);
    req.flush({ message: 'não encontrada' }, { status: 404, statusText: 'Not Found' });
    expect(capturedStatus).toBe(404);
  });

  it('start() propaga erro 409 quando há conflito de transição', () => {
    let capturedStatus: number | undefined;
    service.start('exec-1').subscribe({
      error: (err) => (capturedStatus = err.status),
    });

    const req = httpMock.expectOne(`${baseUrl}/exec-1/start`);
    req.flush({ message: 'transição inválida' }, { status: 409, statusText: 'Conflict' });
    expect(capturedStatus).toBe(409);
  });

  // Fase 13.7/M1: nenhuma chamada HTTP desta feature pode ficar pendente
  // indefinidamente. fakeAsync/tick avança o tempo deterministicamente —
  // não espera os 30s reais.
  it(`get() emite TimeoutError se o backend não responder em ${AUTO_QA_HTTP_TIMEOUT_MS}ms`, fakeAsync(() => {
    let capturedError: unknown;
    service.get('exec-1').subscribe({ error: (err) => (capturedError = err) });

    httpMock.expectOne(`${baseUrl}/exec-1`);
    tick(AUTO_QA_HTTP_TIMEOUT_MS);

    expect(capturedError).toBeInstanceOf(TimeoutError);
  }));

  it('get() não emite TimeoutError se o backend responder antes do timeout', fakeAsync(() => {
    let capturedError: unknown;
    let capturedResponse: AutoQaExecutionResponse | undefined;
    service.get('exec-1').subscribe({
      next: (resp) => (capturedResponse = resp),
      error: (err) => (capturedError = err),
    });

    const req = httpMock.expectOne(`${baseUrl}/exec-1`);
    tick(AUTO_QA_HTTP_TIMEOUT_MS - 1);
    req.flush(sampleResponse);
    tick(1);

    expect(capturedError).toBeUndefined();
    expect(capturedResponse).toEqual(sampleResponse);
  }));
});

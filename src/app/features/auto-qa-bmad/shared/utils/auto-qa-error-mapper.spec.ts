import { HttpErrorResponse } from '@angular/common/http';
import { mapHttpErrorToUiError } from './auto-qa-error-mapper';

describe('mapHttpErrorToUiError', () => {
  function errorResponse(status: number, error: unknown = {}): HttpErrorResponse {
    return new HttpErrorResponse({ status, error, url: '/api/auto-qa/executions/exec-1' });
  }

  it('mapeia 400 para requisição inválida, recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(400));
    expect(uiError.status).toBe(400);
    expect(uiError.code).toBe('BAD_REQUEST');
    expect(uiError.recoverable).toBeTrue();
    expect(uiError.title).toBeTruthy();
    expect(uiError.message).toBeTruthy();
  });

  it('mapeia 403 para ação não permitida, não recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(403));
    expect(uiError.code).toBe('FORBIDDEN');
    expect(uiError.recoverable).toBeFalse();
  });

  it('mapeia 404 para execução não encontrada, não recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(404));
    expect(uiError.code).toBe('NOT_FOUND');
    expect(uiError.recoverable).toBeFalse();
  });

  it('mapeia 409 para conflito de estado, recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(409));
    expect(uiError.code).toBe('CONFLICT');
    expect(uiError.recoverable).toBeTrue();
  });

  it('mapeia 422 para estado inconsistente, não recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(422));
    expect(uiError.code).toBe('UNPROCESSABLE');
    expect(uiError.recoverable).toBeFalse();
  });

  it('mapeia 500 para erro no servidor, recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(500));
    expect(uiError.code).toBe('SERVER_ERROR');
    expect(uiError.recoverable).toBeTrue();
  });

  it('mapeia status 0 (falha de rede) para NETWORK_ERROR, recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(0));
    expect(uiError.code).toBe('NETWORK_ERROR');
    expect(uiError.recoverable).toBeTrue();
  });

  it('mapeia status não catalogado para UNKNOWN_ERROR, recuperável', () => {
    const uiError = mapHttpErrorToUiError(errorResponse(418));
    expect(uiError.code).toBe('UNKNOWN_ERROR');
    expect(uiError.recoverable).toBeTrue();
  });

  it('nunca repassa mensagem bruta, stacktrace ou payload do backend', () => {
    const backendPayload = {
      message: 'java.lang.NullPointerException at com.br.criarcenariotestes...',
      stacktrace: ['at com.br.criarcenariotestes.Foo.bar(Foo.java:42)'],
      path: '/Users/jean/projetos/segredo',
    };
    const uiError = mapHttpErrorToUiError(errorResponse(500, backendPayload));

    const serialized = JSON.stringify(uiError);
    expect(serialized).not.toContain('NullPointerException');
    expect(serialized).not.toContain('java.lang');
    expect(serialized).not.toContain('Foo.java');
    expect(serialized).not.toContain('/Users/jean');
  });
});

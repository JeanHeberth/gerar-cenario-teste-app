import { HttpErrorResponse } from '@angular/common/http';

export interface AutoQaUiError {
  status: number;
  code: string;
  title: string;
  message: string;
  recoverable: boolean;
}

/**
 * Único ponto de tradução de erro HTTP para mensagem de UI. Nunca repassa
 * `error.error` (mensagem/stacktrace/payload cru do backend) — sempre usa
 * texto estático em português por status, mesmo que o backend já sanitize
 * a própria resposta (defesa em profundidade).
 */
const ERROR_CATALOG: Record<string, Omit<AutoQaUiError, 'status'>> = {
  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    title: 'Requisição inválida',
    message: 'Os dados enviados são inválidos. Revise o formulário e tente novamente.',
    recoverable: true,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    title: 'Ação não permitida',
    message: 'Esta ação não está disponível no momento.',
    recoverable: false,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    title: 'Execução não encontrada',
    message: 'A execução solicitada não existe ou foi removida.',
    recoverable: false,
  },
  CONFLICT: {
    code: 'CONFLICT',
    title: 'Conflito de estado',
    message: 'Esta execução foi alterada por outra operação. Atualize e tente novamente.',
    recoverable: true,
  },
  UNPROCESSABLE: {
    code: 'UNPROCESSABLE',
    title: 'Estado inconsistente',
    message: 'O estado atual da execução não permite esta operação.',
    recoverable: false,
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    title: 'Erro no servidor',
    message: 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.',
    recoverable: true,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    title: 'Falha de conexão',
    message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    recoverable: true,
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    title: 'Erro inesperado',
    message: 'Ocorreu um erro inesperado.',
    recoverable: true,
  },
};

const STATUS_TO_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  500: 'SERVER_ERROR',
  0: 'NETWORK_ERROR',
};

export function mapHttpErrorToUiError(error: HttpErrorResponse): AutoQaUiError {
  const code = STATUS_TO_CODE[error.status] ?? 'UNKNOWN_ERROR';
  const entry = ERROR_CATALOG[code];
  return { status: error.status, ...entry };
}

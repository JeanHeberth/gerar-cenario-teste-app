import { AutoQaAvailableAction } from './auto-qa-enums.model';

/**
 * Fonte única de label por AutoQaAvailableAction. Usado pela ActionBar e
 * pelo resumo de encerramento (ExecutionResultSummary) — nenhum dos dois
 * deve duplicar esse texto.
 *
 * Este catálogo apenas traduz AutoQaAvailableAction para metadata visual
 * (label). Ele não determina se uma ação está disponível. A disponibilidade
 * continua sendo definida exclusivamente por
 * AutoQaExecutionResponse.availableActions — nenhum consumidor deste
 * catálogo deve usá-lo para habilitar/desabilitar ações, calcular permissão
 * ou inferir WorkflowStatus/currentStage necessários.
 */
export const AUTO_QA_ACTION_LABELS: Record<AutoQaAvailableAction, string> = {
  START: 'Iniciar',
  CONTINUE: 'Continuar',
  GENERATE: 'Gerar código',
  APPROVE_FILE_UPDATE: 'Aprovar aplicação de arquivos',
  APPLY: 'Aplicar arquivos',
  APPROVE_EXECUTION: 'Aprovar execução',
  EXECUTE: 'Executar testes',
  CANCEL: 'Cancelar',
  RETRY: 'Tentar novamente',
  VIEW_GENERATED_FILES: 'Ver arquivos gerados',
  VIEW_DIFF: 'Ver diferenças',
  VIEW_LOGS: 'Ver logs',
  VIEW_LEARNING: 'Ver aprendizado',
  NONE: 'Nenhuma ação disponível',
};

export function getActionLabel(action: AutoQaAvailableAction): string {
  return AUTO_QA_ACTION_LABELS[action];
}

/**
 * Categoria puramente visual (Fase 12.3.8) — só decide a hierarquia/peso
 * visual do botão na ActionBar (destaque, tom, agrupamento). Nunca decide
 * se a ação está disponível: isso continua sendo exclusivamente
 * availableActions. Não reordena nem esconde nenhuma ação.
 */
export type AutoQaActionVisualKind = 'primary' | 'approval' | 'destructive' | 'inspection' | 'neutral';

const ACTION_VISUAL_KIND: Record<AutoQaAvailableAction, AutoQaActionVisualKind> = {
  START: 'primary',
  CONTINUE: 'primary',
  GENERATE: 'primary',
  APPLY: 'primary',
  EXECUTE: 'primary',
  APPROVE_FILE_UPDATE: 'approval',
  APPROVE_EXECUTION: 'approval',
  CANCEL: 'destructive',
  VIEW_GENERATED_FILES: 'inspection',
  VIEW_DIFF: 'inspection',
  VIEW_LOGS: 'inspection',
  VIEW_LEARNING: 'inspection',
  RETRY: 'neutral',
  NONE: 'neutral',
};

export function getActionVisualKind(action: AutoQaAvailableAction): AutoQaActionVisualKind {
  return ACTION_VISUAL_KIND[action];
}

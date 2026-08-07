/**
 * Catálogo central e determinístico das 10 etapas do workflow Auto QA,
 * espelhando a ordem real de com.br.criarcenariotestes...AutoQaStage
 * (DISCOVERY=0 .. LEARNING=9). Fonte única de título, descrição, ícone e
 * mensagens das etapas — nenhum outro componente deve duplicar esses textos.
 * Não contém regra de transição nem decide availableActions: isso continua
 * vindo exclusivamente do backend.
 */

export type AutoQaStageId =
  | 'DISCOVERY'
  | 'SCENARIO_ANALYSIS'
  | 'PROJECT_KNOWLEDGE'
  | 'PLANNING'
  | 'GENERATION'
  | 'REVIEW'
  | 'APPLY'
  | 'EXECUTION'
  | 'FAILURE_ANALYSIS'
  | 'LEARNING';

export type AutoQaStageVisualTone = 'neutral' | 'success' | 'warning';

export interface AutoQaStageMetadata {
  stage: AutoQaStageId;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  visualTone: AutoQaStageVisualTone;
  loadingMessage: string;
  successMessage: string;
  errorMessage: string;
}

export const AUTO_QA_STAGE_CATALOG: readonly AutoQaStageMetadata[] = [
  {
    stage: 'DISCOVERY',
    order: 0,
    title: 'Descoberta do Projeto',
    shortTitle: 'Descoberta',
    description: 'Identifica framework, linguagem, gerenciador de pacotes e comandos sugeridos do projeto alvo.',
    icon: 'search',
    visualTone: 'neutral',
    loadingMessage: 'Analisando a estrutura do projeto...',
    successMessage: 'Projeto identificado com sucesso.',
    errorMessage: 'Não foi possível identificar o projeto.',
  },
  {
    stage: 'SCENARIO_ANALYSIS',
    order: 1,
    title: 'Análise do Cenário',
    shortTitle: 'Cenário',
    description: 'Interpreta o cenário de teste informado e extrai os requisitos de automação.',
    icon: 'file-text',
    visualTone: 'neutral',
    loadingMessage: 'Analisando o cenário informado...',
    successMessage: 'Cenário analisado com sucesso.',
    errorMessage: 'Não foi possível analisar o cenário.',
  },
  {
    stage: 'PROJECT_KNOWLEDGE',
    order: 2,
    title: 'Conhecimento do Projeto',
    shortTitle: 'Conhecimento',
    description: 'Mapeia classes, page objects, fixtures e convenções já existentes no projeto.',
    icon: 'book-open',
    visualTone: 'neutral',
    loadingMessage: 'Mapeando classes e convenções existentes...',
    successMessage: 'Base de conhecimento do projeto construída.',
    errorMessage: 'Não foi possível mapear o conhecimento do projeto.',
  },
  {
    stage: 'PLANNING',
    order: 3,
    title: 'Planejamento Técnico',
    shortTitle: 'Planejamento',
    description: 'Monta o plano técnico de automação: componentes a reutilizar, arquivos a criar e riscos.',
    icon: 'clipboard-list',
    visualTone: 'neutral',
    loadingMessage: 'Montando o plano técnico...',
    successMessage: 'Plano técnico pronto.',
    errorMessage: 'Não foi possível montar o plano técnico.',
  },
  {
    stage: 'GENERATION',
    order: 4,
    title: 'Geração de Código',
    shortTitle: 'Geração',
    description: 'Gera os arquivos de automação a partir do plano técnico aprovado.',
    icon: 'code',
    visualTone: 'neutral',
    loadingMessage: 'Gerando os arquivos de automação...',
    successMessage: 'Código gerado com sucesso.',
    errorMessage: 'Não foi possível gerar o código.',
  },
  {
    stage: 'REVIEW',
    order: 5,
    title: 'Revisão de Código',
    shortTitle: 'Revisão',
    description: 'Revisa o código gerado, apontando problemas e sugestões antes da aplicação.',
    icon: 'eye',
    visualTone: 'neutral',
    loadingMessage: 'Revisando o código gerado...',
    successMessage: 'Revisão concluída.',
    errorMessage: 'Não foi possível concluir a revisão.',
  },
  {
    stage: 'APPLY',
    order: 6,
    title: 'Aplicação de Arquivos',
    shortTitle: 'Aplicação',
    description: 'Aplica os arquivos gerados no projeto alvo, mediante aprovação explícita.',
    icon: 'file-check',
    visualTone: 'neutral',
    loadingMessage: 'Aplicando os arquivos no projeto...',
    successMessage: 'Arquivos aplicados com sucesso.',
    errorMessage: 'Não foi possível aplicar os arquivos.',
  },
  {
    stage: 'EXECUTION',
    order: 7,
    title: 'Execução dos Testes',
    shortTitle: 'Execução',
    description: 'Executa os testes gerados no projeto alvo, mediante aprovação explícita dos comandos.',
    icon: 'play',
    visualTone: 'neutral',
    loadingMessage: 'Executando os testes...',
    successMessage: 'Execução concluída com sucesso.',
    errorMessage: 'A execução dos testes falhou.',
  },
  {
    stage: 'FAILURE_ANALYSIS',
    order: 8,
    title: 'Análise de Falha',
    shortTitle: 'Falha',
    description: 'Analisa a causa provável de uma falha de execução e sugere correções.',
    icon: 'alert-triangle',
    visualTone: 'warning',
    loadingMessage: 'Analisando a causa da falha...',
    successMessage: 'Causa da falha identificada.',
    errorMessage: 'Não foi possível analisar a falha.',
  },
  {
    stage: 'LEARNING',
    order: 9,
    title: 'Aprendizado',
    shortTitle: 'Aprendizado',
    description: 'Registra o aprendizado da execução para melhorar futuras gerações.',
    icon: 'graduation-cap',
    visualTone: 'success',
    loadingMessage: 'Registrando aprendizado...',
    successMessage: 'Aprendizado registrado.',
    errorMessage: 'Não foi possível registrar o aprendizado.',
  },
];

export const AUTO_QA_STAGE_IDS: readonly AutoQaStageId[] = AUTO_QA_STAGE_CATALOG.map((entry) => entry.stage);

export function getStageMetadata(stage: AutoQaStageId): AutoQaStageMetadata {
  const found = AUTO_QA_STAGE_CATALOG.find((entry) => entry.stage === stage);
  if (!found) {
    throw new Error(`Etapa desconhecida no catálogo Auto QA: ${stage}`);
  }
  return found;
}

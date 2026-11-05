/** Espelha NavegacaoPastasResponse do backend. */
export interface PastaNavegavel {
  nome: string;
  caminho: string;
}

export interface NavegacaoPastas {
  /** Caminho listado; null quando são as raízes autorizadas. */
  caminhoAtual: string | null;

  /** Destino do "voltar"; null quando já se está numa raiz autorizada. */
  caminhoPai: string | null;

  /** Se o caminho atual pode ser escolhido como projeto. */
  selecionavel: boolean;

  pastas: PastaNavegavel[];
}

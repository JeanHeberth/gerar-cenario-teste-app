/**
 * Função pura — calcula a duração da execução exclusivamente a partir de
 * duas datas reais do próprio DTO público (startedAt/finishedAt). Nunca
 * inventa duração quando um dos dois dados está ausente ou é inconsistente
 * (finishedAt anterior a startedAt).
 */
export function resolveExecutionDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) {
    return null;
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const totalSeconds = Math.floor((end - start) / 1000);

  if (totalSeconds < 0) {
    return null;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

import {
  InspectionResourceAvailability,
  InspectionResourceId,
} from '../../models/inspection-resource-availability.model';

/**
 * Função pura — responde exclusivamente "existe conteúdo real que o
 * frontend atual consegue apresentar para este recurso?". Nunca responde
 * "o usuário pode executar esta ação" (isso é availableActions, um
 * conceito diferente e não relacionado a este resolver).
 */
const AVAILABILITY_BY_RESOURCE: Record<InspectionResourceId, InspectionResourceAvailability> = {
  HISTORY: 'SUPPORTED',
  GENERATED_FILES: 'UNAVAILABLE',
  PREVIEW: 'UNAVAILABLE',
  DIFF: 'UNAVAILABLE',
  LOGS: 'UNAVAILABLE',
  LEARNING: 'PARTIAL',
  RETRY: 'UNAVAILABLE',
};

export function resolveInspectionResourceAvailability(
  resource: InspectionResourceId
): InspectionResourceAvailability {
  return AVAILABILITY_BY_RESOURCE[resource];
}

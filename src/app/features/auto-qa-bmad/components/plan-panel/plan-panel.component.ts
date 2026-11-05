import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AutoQaPublicPlan } from '../../models/auto-qa-execution.model';

/**
 * Mostra o plano técnico antes do portão de aprovação de geração.
 *
 * Existe porque o portão era cego: o usuário clicava em "Aprovar e gerar
 * código" sem ver o que seria gerado, e as advertências da auditoria de reuso —
 * feitas justamente para informar essa decisão — não chegavam a ele.
 *
 * Apresentacional. Só interpolação ({{ }}) — nunca innerHTML nem HTML vindo do
 * backend.
 */
@Component({
  selector: 'app-plan-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-panel.component.html',
  styleUrl: './plan-panel.component.scss',
})
export class PlanPanelComponent {
  readonly plan = input<AutoQaPublicPlan | null>(null);
}

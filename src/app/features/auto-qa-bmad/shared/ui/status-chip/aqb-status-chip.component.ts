import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AqbBadgeComponent } from '../../../../../shared/ui/badge/aqb-badge.component';
import { AutoQaWorkflowStatus } from '../../../models/auto-qa-enums.model';
import { getStatusMetadata } from '../../../models/auto-qa-status-catalog';

@Component({
  selector: 'aqb-status-chip',
  standalone: true,
  imports: [AqbBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-status-chip.component.html',
})
export class AqbStatusChipComponent {
  readonly status = input.required<AutoQaWorkflowStatus>();

  protected readonly metadata = computed(() => getStatusMetadata(this.status()));
}

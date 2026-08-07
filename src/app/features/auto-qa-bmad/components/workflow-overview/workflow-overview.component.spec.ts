import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowOverviewComponent } from './workflow-overview.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('WorkflowOverviewComponent', () => {
  let fixture: ComponentFixture<WorkflowOverviewComponent>;

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: null,
    lastStageStarted: null,
    lastStageCompleted: null,
    attempt: 0,
    progress: 0,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
    startedAt: null,
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [WorkflowOverviewComponent] });
    fixture = TestBed.createComponent(WorkflowOverviewComponent);
  });

  function items(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('.workflow-overview__item');
  }

  it('renderiza as 10 etapas do catálogo, na ordem', () => {
    fixture.componentRef.setInput('execution', null);
    fixture.detectChanges();

    expect(items().length).toBe(10);
    expect(items()[0].textContent).toContain('Descoberta');
    expect(items()[9].textContent).toContain('Aprendizado');
  });

  it('sem execução (null), todas as etapas ficam pendentes', () => {
    fixture.componentRef.setInput('execution', null);
    fixture.detectChanges();

    items().forEach((item) => expect(item.classList).toContain('workflow-overview__item--pending'));
  });

  it('marca como concluídas as etapas até lastStageCompleted e como atual o currentStage', () => {
    fixture.componentRef.setInput(
      'execution',
      execution({ lastStageCompleted: 'PROJECT_KNOWLEDGE', currentStage: 'PLANNING', status: 'RUNNING' })
    );
    fixture.detectChanges();

    const all = Array.from(items());
    expect(all[0].classList).toContain('workflow-overview__item--done'); // DISCOVERY
    expect(all[1].classList).toContain('workflow-overview__item--done'); // SCENARIO_ANALYSIS
    expect(all[2].classList).toContain('workflow-overview__item--done'); // PROJECT_KNOWLEDGE
    expect(all[3].classList).toContain('workflow-overview__item--current'); // PLANNING
    expect(all[3].getAttribute('aria-current')).toBe('step');
    expect(all[4].classList).toContain('workflow-overview__item--pending'); // GENERATION
  });

  it('quando o status é FAILED, marca a etapa atual como failed (não inventa um status ausente no DTO)', () => {
    fixture.componentRef.setInput(
      'execution',
      execution({ lastStageCompleted: 'REVIEW', currentStage: 'EXECUTION', status: 'FAILED' })
    );
    fixture.detectChanges();

    const all = Array.from(items());
    expect(all[7].classList).toContain('workflow-overview__item--failed'); // EXECUTION
  });

  it('possui rótulo acessível na lista', () => {
    fixture.componentRef.setInput('execution', null);
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('[role="list"]');
    expect(list?.getAttribute('aria-label')).toBeTruthy();
  });
});

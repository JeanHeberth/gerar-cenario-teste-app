import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StageTimelineComponent } from './stage-timeline.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('StageTimelineComponent', () => {
  let fixture: ComponentFixture<StageTimelineComponent>;

  const execution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'RUNNING',
    currentStage: 'GENERATION',
    lastStageStarted: 'GENERATION',
    lastStageCompleted: 'PLANNING',
    attempt: 0,
    progress: 40,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
    startedAt: '2026-08-06T10:00:00Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StageTimelineComponent] });
    fixture = TestBed.createComponent(StageTimelineComponent);
  });

  function items(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('[role="option"]');
  }

  it('renderiza as 10 etapas do catálogo, na ordem', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();

    expect(items().length).toBe(10);
    expect(items()[0].textContent).toContain('Descoberta do Projeto');
    expect(items()[9].textContent).toContain('Aprendizado');
  });

  it('marca a etapa atual com aria-current="step"', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();

    const current = Array.from(items()).find((el) => el.getAttribute('aria-current') === 'step');
    expect(current?.textContent).toContain('Geração de Código');
  });

  it('marca como selecionada a etapa informada em selectedStage', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.componentRef.setInput('selectedStage', 'PLANNING');
    fixture.detectChanges();

    const selected = Array.from(items()).find((el) => el.getAttribute('aria-selected') === 'true');
    expect(selected?.textContent).toContain('Planejamento Técnico');
  });

  it('emite stageSelected com o id da etapa clicada', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.stageSelected.subscribe((stage) => (emitted = stage));

    items()[0].click();

    expect(emitted).toBe('DISCOVERY');
  });

  it('expõe role="listbox" com rótulo acessível', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox.getAttribute('aria-label')).toBeTruthy();
  });

  it('não altera o objeto execution recebido ao renderizar', () => {
    const exec = execution();
    const snapshot = JSON.stringify(exec);
    fixture.componentRef.setInput('execution', exec);
    fixture.detectChanges();
    expect(JSON.stringify(exec)).toBe(snapshot);
  });
});

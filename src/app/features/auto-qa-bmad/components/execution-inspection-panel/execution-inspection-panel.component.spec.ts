import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionInspectionPanelComponent } from './execution-inspection-panel.component';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('ExecutionInspectionPanelComponent', () => {
  let fixture: ComponentFixture<ExecutionInspectionPanelComponent>;

  const baseExecution = (overrides: Partial<AutoQaExecutionResponse> = {}): AutoQaExecutionResponse => ({
    executionId: 'exec-1',
    scenario: 'Login com credenciais válidas',
    status: 'COMPLETED',
    currentStage: null,
    lastStageStarted: 'EXECUTION',
    lastStageCompleted: 'LEARNING',
    attempt: 1,
    progress: 100,
    availableActions: [],
    warnings: [],
    errors: [],
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:05:00Z',
    startedAt: '2026-08-06T10:00:00Z',
    finishedAt: '2026-08-06T10:05:00Z',
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionInspectionPanelComponent] });
    fixture = TestBed.createComponent(ExecutionInspectionPanelComponent);
    fixture.componentRef.setInput('execution', baseExecution());
  });

  function tabs(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
  }

  it('renderiza um role="tablist" com 4 abas: Resumo, Artefatos, Diff, Logs', () => {
    fixture.detectChanges();
    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    const items = tabs();
    expect(items.length).toBe(4);
    expect(items.map((t) => t.textContent?.trim())).toEqual([
      jasmine.stringMatching('Resumo'),
      jasmine.stringMatching('Artefatos'),
      jasmine.stringMatching('Diff'),
      jasmine.stringMatching('Logs'),
    ]);
  });

  it('por padrão (selected=RESUMO) mostra o painel de Resumo com ExecutionResultSummary', () => {
    fixture.componentRef.setInput('selected', 'RESUMO');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"] app-execution-result-summary')).not.toBeNull();
  });

  it('aria-selected é true apenas na aba correspondente ao input selected', () => {
    fixture.componentRef.setInput('selected', 'DIFF');
    fixture.detectChanges();

    const items = tabs();
    const selectedStates = items.map((t) => t.getAttribute('aria-selected'));
    expect(selectedStates).toEqual(['false', 'false', 'true', 'false']);
  });

  it('quando selected=GENERATED_FILES mostra a mensagem de indisponibilidade de Artefatos', () => {
    fixture.componentRef.setInput('selected', 'GENERATED_FILES');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]').textContent).toContain(
      'Os detalhes dos arquivos gerados não estão disponíveis no contrato público atual.'
    );
  });

  it('quando selected=DIFF mostra a mensagem de indisponibilidade de Diff', () => {
    fixture.componentRef.setInput('selected', 'DIFF');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]').textContent).toContain(
      'Diff não disponível no contrato público atual.'
    );
  });

  it('quando selected=LOGS mostra a mensagem de indisponibilidade de Logs', () => {
    fixture.componentRef.setInput('selected', 'LOGS');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"]').textContent).toContain(
      'Logs detalhados da execução não são expostos pela API atual.'
    );
  });

  it('não mostra spinner/loading para recursos indisponíveis', () => {
    fixture.componentRef.setInput('selected', 'LOGS');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="tabpanel"] [role="status"]')).toBeNull();
  });

  it('cada aba possui aria-controls apontando para o id do respectivo tabpanel', () => {
    fixture.componentRef.setInput('selected', 'RESUMO');
    fixture.detectChanges();

    const resumoTab = tabs()[0];
    const controls = resumoTab.getAttribute('aria-controls');
    const panel = fixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(controls).toBe(panel.id);
  });

  it('clicar em uma aba emite selectedChange com o id correspondente', () => {
    fixture.componentRef.setInput('selected', 'RESUMO');
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.selectedChange.subscribe((id) => (emitted = id));

    tabs()[1].click();

    expect(emitted).toBe('GENERATED_FILES');
  });

  it('ArrowRight move o foco e emite a próxima aba, com wrap-around da última para a primeira', () => {
    fixture.componentRef.setInput('selected', 'LOGS');
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.selectedChange.subscribe((id) => (emitted = id));

    const items = tabs();
    items[3].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(emitted).toBe('RESUMO');
  });

  it('ArrowLeft move o foco e emite a aba anterior, com wrap-around da primeira para a última', () => {
    fixture.componentRef.setInput('selected', 'RESUMO');
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.selectedChange.subscribe((id) => (emitted = id));

    const items = tabs();
    items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

    expect(emitted).toBe('LOGS');
  });
});

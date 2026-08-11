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

  describe('roving tabindex e navegação por teclado (Fase 13.8)', () => {
    function listbox(): HTMLElement {
      return fixture.nativeElement.querySelector('[role="listbox"]');
    }

    it('somente o item selecionado possui tabindex="0"; os demais têm "-1"', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'PLANNING');
      fixture.detectChanges();

      const all = Array.from(items());
      const tabbable = all.filter((el) => el.getAttribute('tabindex') === '0');
      expect(tabbable.length).toBe(1);
      expect(tabbable[0].textContent).toContain('Planejamento Técnico');
      expect(all.filter((el) => el.getAttribute('tabindex') === '-1').length).toBe(9);
    });

    it('sem selectedStage explícito, o primeiro item fica tabbable como fallback determinístico', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.detectChanges();

      const tabbable = Array.from(items()).filter((el) => el.getAttribute('tabindex') === '0');
      expect(tabbable.length).toBe(1);
      expect(tabbable[0].textContent).toContain('Descoberta do Projeto');
    });

    function emitStages(): string[] {
      const emitted: string[] = [];
      fixture.componentInstance.stageSelected.subscribe((stage) => emitted.push(stage));
      return emitted;
    }

    it('ArrowDown seleciona e foca a próxima etapa (selection follows focus)', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'DISCOVERY');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(emitted).toEqual(['SCENARIO_ANALYSIS']);
    });

    it('ArrowRight seleciona a próxima etapa', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'DISCOVERY');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(emitted).toEqual(['SCENARIO_ANALYSIS']);
    });

    it('ArrowUp seleciona a etapa anterior', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'PLANNING');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(emitted).toEqual(['PROJECT_KNOWLEDGE']);
    });

    it('ArrowLeft seleciona a etapa anterior', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'PLANNING');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(emitted).toEqual(['PROJECT_KNOWLEDGE']);
    });

    it('ArrowDown na última etapa dá wrap-around para a primeira', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'LEARNING');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(emitted).toEqual(['DISCOVERY']);
    });

    it('ArrowUp na primeira etapa dá wrap-around para a última', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'DISCOVERY');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(emitted).toEqual(['LEARNING']);
    });

    it('Home vai direto para a primeira etapa, sem wrap', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'REVIEW');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(emitted).toEqual(['DISCOVERY']);
    });

    it('End vai direto para a última etapa, sem wrap', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'REVIEW');
      fixture.detectChanges();
      const emitted = emitStages();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(emitted).toEqual(['LEARNING']);
    });

    it('move o foco DOM para o novo item ativo após navegação por seta', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'DISCOVERY');
      fixture.detectChanges();

      listbox().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      fixture.detectChanges();

      expect(document.activeElement?.textContent).toContain('Análise do Cenário');
    });

    it('não interfere em Enter/Space, que continuam tratados pelo próprio item', () => {
      fixture.componentRef.setInput('execution', execution());
      fixture.componentRef.setInput('selectedStage', 'DISCOVERY');
      fixture.detectChanges();
      const emitted = emitStages();

      items()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(emitted).toEqual(['PROJECT_KNOWLEDGE']);
    });
  });
});

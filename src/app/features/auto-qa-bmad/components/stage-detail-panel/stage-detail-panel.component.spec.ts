import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StageDetailPanelComponent } from './stage-detail-panel.component';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';
import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';

describe('StageDetailPanelComponent', () => {
  let fixture: ComponentFixture<StageDetailPanelComponent>;
  const metadata = getStageMetadata('GENERATION');

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
    updatedAt: '2026-08-06T11:15:00Z',
    startedAt: '2026-08-06T10:00:00Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StageDetailPanelComponent] });
    fixture = TestBed.createComponent(StageDetailPanelComponent);
    fixture.componentRef.setInput('metadata', metadata);
    fixture.componentRef.setInput('state', 'CURRENT');
  });

  it('renderiza título e descrição da etapa em um heading acessível', () => {
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h2, h3');
    expect(heading.textContent).toContain(metadata.title);
    expect(fixture.nativeElement.textContent).toContain(metadata.description);
  });

  it('renderiza o rótulo do estado visual', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Em andamento');
  });

  it('renderiza a mensagem contextual correspondente ao estado', () => {
    fixture.componentRef.setInput('state', 'FAILED');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(metadata.errorMessage);
  });

  it('não renderiza seção de última atualização quando não há execução (ausência de dados)', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.stage-detail-panel__updated-at')).toBeNull();
  });

  it('renderiza a última atualização da execução quando presente, rotulada no nível da execução', () => {
    fixture.componentRef.setInput('execution', execution());
    fixture.detectChanges();
    const updatedAt = fixture.nativeElement.querySelector('.stage-detail-panel__updated-at');
    expect(updatedAt).not.toBeNull();
    expect(updatedAt.textContent.toLowerCase()).toContain('execução');
  });

  it('renderiza os detailSections do catálogo e o aviso de detalhe futuro', () => {
    fixture.detectChanges();
    for (const section of metadata.detailSections) {
      expect(fixture.nativeElement.textContent).toContain(section);
    }
    expect(fixture.nativeElement.textContent).toContain('Detalhes adicionais estarão disponíveis em uma etapa futura.');
  });

  it('o painel é uma região acessível com rótulo', () => {
    fixture.detectChanges();
    const region = fixture.nativeElement.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBeTruthy();
  });
});

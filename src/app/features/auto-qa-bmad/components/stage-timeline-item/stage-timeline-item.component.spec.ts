import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StageTimelineItemComponent } from './stage-timeline-item.component';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';

describe('StageTimelineItemComponent', () => {
  let fixture: ComponentFixture<StageTimelineItemComponent>;
  const metadata = getStageMetadata('GENERATION');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StageTimelineItemComponent] });
    fixture = TestBed.createComponent(StageTimelineItemComponent);
    fixture.componentRef.setInput('metadata', metadata);
    fixture.componentRef.setInput('state', 'PENDING');
  });

  function host(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="option"]');
  }

  it('renderiza título, ícone e mensagem contextual do estado', () => {
    fixture.detectChanges();
    expect(host().textContent).toContain(metadata.title);
    expect(fixture.nativeElement.querySelector('aqb-stage-icon')).not.toBeNull();
    expect(host().textContent).toContain(metadata.pendingMessage);
  });

  it('exibe o rótulo textual do estado (não depende só de cor)', () => {
    fixture.componentRef.setInput('state', 'FAILED');
    fixture.detectChanges();
    expect(host().textContent).toContain('Falhou');
  });

  it('define aria-current="step" quando state é CURRENT', () => {
    fixture.componentRef.setInput('state', 'CURRENT');
    fixture.detectChanges();
    expect(host().getAttribute('aria-current')).toBe('step');
  });

  it('não define aria-current quando state não é CURRENT', () => {
    fixture.detectChanges();
    expect(host().getAttribute('aria-current')).toBeNull();
  });

  it('reflete aria-selected a partir do input selected', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    expect(host().getAttribute('aria-selected')).toBe('true');
  });

  it('não é tabbable por padrão quando não é o item ativo (roving tabindex, Fase 13.8)', () => {
    fixture.detectChanges();
    expect(host().getAttribute('tabindex')).toBe('-1');
  });

  it('é tabbable (tabindex="0") quando é o item ativo (roving tabindex, Fase 13.8)', () => {
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    expect(host().getAttribute('tabindex')).toBe('0');
  });

  it('deixa de ser tabbable (tabindex="-1") quando active passa a false', () => {
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    expect(host().getAttribute('tabindex')).toBe('-1');
  });

  it('expõe focus() para o container mover o foco programaticamente para o item', () => {
    fixture.detectChanges();
    const focusSpy = spyOn(host(), 'focus');
    fixture.componentInstance.focus();
    expect(focusSpy).toHaveBeenCalled();
  });

  it('emite stageSelected ao clicar', () => {
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.stageSelected.subscribe(() => (emitted = true));

    host().click();

    expect(emitted).toBeTrue();
  });

  it('emite stageSelected ao pressionar Enter', () => {
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.stageSelected.subscribe(() => (emitted = true));

    host().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toBeTrue();
  });

  it('emite stageSelected ao pressionar Espaço', () => {
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.stageSelected.subscribe(() => (emitted = true));

    host().dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(emitted).toBeTrue();
  });
});

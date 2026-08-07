import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbStageIconComponent } from './aqb-stage-icon.component';
import { AUTO_QA_STAGE_IDS } from '../../../models/auto-qa-stage-catalog';

describe('AqbStageIconComponent', () => {
  let fixture: ComponentFixture<AqbStageIconComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbStageIconComponent] });
    fixture = TestBed.createComponent(AqbStageIconComponent);
  });

  it('renderiza um <svg> decorativo (aria-hidden) para cada uma das 10 etapas', () => {
    for (const stage of AUTO_QA_STAGE_IDS) {
      fixture.componentRef.setInput('stage', stage);
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).withContext(`stage ${stage}`).not.toBeNull();
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('não usa emoji em nenhum caractere do template renderizado', () => {
    fixture.componentRef.setInput('stage', 'DISCOVERY');
    fixture.detectChanges();
    // eslint-disable-next-line no-misleading-character-class
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiPattern.test(fixture.nativeElement.textContent)).toBeFalse();
  });
});

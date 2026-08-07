import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbStatusChipComponent } from './aqb-status-chip.component';
import { AUTO_QA_STATUS_METADATA } from '../../../models/auto-qa-status-catalog';

describe('AqbStatusChipComponent', () => {
  let fixture: ComponentFixture<AqbStatusChipComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbStatusChipComponent] });
    fixture = TestBed.createComponent(AqbStatusChipComponent);
  });

  it('renderiza o label do catálogo para o status informado', () => {
    fixture.componentRef.setInput('status', 'RUNNING');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe(AUTO_QA_STATUS_METADATA.RUNNING.label);
  });

  it('aplica o tone correspondente ao status (ex.: COMPLETED -> success)', () => {
    fixture.componentRef.setInput('status', 'COMPLETED');
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.aqb-badge');
    expect(badge.classList).toContain('aqb-badge--success');
  });

  it('comunica o status por texto, não só por cor (title com a descrição)', () => {
    fixture.componentRef.setInput('status', 'FAILED');
    fixture.detectChanges();
    const hostBadge = fixture.nativeElement.querySelector('aqb-badge');
    expect(hostBadge.getAttribute('title')).toBeTruthy();
  });
});

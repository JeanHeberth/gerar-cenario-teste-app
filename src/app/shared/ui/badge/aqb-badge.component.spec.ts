import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbBadgeComponent } from './aqb-badge.component';

@Component({
  standalone: true,
  imports: [AqbBadgeComponent],
  template: `<aqb-badge [tone]="tone">Concluído</aqb-badge>`,
})
class HostComponent {
  tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral';
}

describe('AqbBadgeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function badge(): HTMLElement {
    return fixture.nativeElement.querySelector('.aqb-badge');
  }

  it('usa o tom "neutral" por padrão e projeta o conteúdo', () => {
    fixture.detectChanges();
    expect(badge().classList).toContain('aqb-badge--neutral');
    expect(badge().textContent?.trim()).toBe('Concluído');
  });

  it('aplica o tom informado', () => {
    fixture.componentInstance.tone = 'success';
    fixture.detectChanges();
    expect(badge().classList).toContain('aqb-badge--success');
  });
});

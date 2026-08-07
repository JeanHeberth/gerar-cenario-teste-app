import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbCardComponent } from './aqb-card.component';

@Component({
  standalone: true,
  imports: [AqbCardComponent],
  template: `<aqb-card [padding]="padding"><p>Conteúdo do card</p></aqb-card>`,
})
class HostComponent {
  padding: 'sm' | 'md' | 'lg' = 'md';
}

describe('AqbCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  function card(): HTMLElement {
    return fixture.nativeElement.querySelector('.aqb-card');
  }

  it('usa padding "md" por padrão e projeta o conteúdo', () => {
    fixture.detectChanges();
    expect(card().classList).toContain('aqb-card--md');
    expect(card().textContent?.trim()).toBe('Conteúdo do card');
  });

  it('aplica o padding informado', () => {
    fixture.componentInstance.padding = 'lg';
    fixture.detectChanges();
    expect(card().classList).toContain('aqb-card--lg');
  });
});

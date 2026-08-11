import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbPanelComponent } from './aqb-panel.component';

@Component({
  standalone: true,
  imports: [AqbPanelComponent],
  template: `<aqb-panel [title]="title"><p>Corpo do painel</p></aqb-panel>`,
})
class HostComponent {
  title: string | undefined;
}

describe('AqbPanelComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza o título quando informado', () => {
    fixture.componentInstance.title = 'Resumo da execução';
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('.aqb-panel__title');
    expect(heading?.textContent?.trim()).toBe('Resumo da execução');
  });

  it('não renderiza título quando ausente', () => {
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('.aqb-panel__title');
    expect(heading).toBeNull();
  });

  it('sempre projeta o conteúdo do corpo', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Corpo do painel');
  });
});

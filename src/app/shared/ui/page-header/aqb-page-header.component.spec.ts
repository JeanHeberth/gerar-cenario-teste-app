import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbPageHeaderComponent } from './aqb-page-header.component';

@Component({
  standalone: true,
  imports: [AqbPageHeaderComponent],
  template: `
    <aqb-page-header [title]="title" [subtitle]="subtitle">
      <button type="button">Ação</button>
    </aqb-page-header>
  `,
})
class HostComponent {
  title = 'Execuções Auto QA';
  subtitle: string | undefined;
}

describe('AqbPageHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza o título obrigatório', () => {
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('.aqb-page-header__title');
    expect(heading.textContent.trim()).toBe('Execuções Auto QA');
  });

  it('renderiza o subtítulo quando informado', () => {
    fixture.componentInstance.subtitle = 'Acompanhe o andamento do workflow';
    fixture.detectChanges();
    const subtitle = fixture.nativeElement.querySelector('.aqb-page-header__subtitle');
    expect(subtitle?.textContent?.trim()).toBe('Acompanhe o andamento do workflow');
  });

  it('não renderiza subtítulo quando ausente', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-page-header__subtitle')).toBeNull();
  });

  it('projeta as ações à direita', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')?.textContent?.trim()).toBe('Ação');
  });
});

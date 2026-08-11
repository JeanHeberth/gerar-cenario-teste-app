import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbEmptyStateComponent } from './aqb-empty-state.component';

@Component({
  standalone: true,
  imports: [AqbEmptyStateComponent],
  template: `
    <aqb-empty-state [title]="title" [description]="description">
      <button type="button">Nova execução</button>
    </aqb-empty-state>
  `,
})
class HostComponent {
  title = 'Nenhuma execução encontrada';
  description: string | undefined;
}

describe('AqbEmptyStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('renderiza o título', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-empty-state__title').textContent.trim()).toBe(
      'Nenhuma execução encontrada'
    );
  });

  it('renderiza a descrição quando informada', () => {
    fixture.componentInstance.description = 'Crie a primeira execução para começar.';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-empty-state__description')?.textContent?.trim()).toBe(
      'Crie a primeira execução para começar.'
    );
  });

  it('projeta a ação', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')?.textContent?.trim()).toBe('Nova execução');
  });
});

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbModalComponent } from './aqb-modal.component';

@Component({
  standalone: true,
  imports: [AqbModalComponent],
  template: `
    <aqb-modal [open]="open" [title]="title" (closed)="onClosed()">
      <p>Conteúdo do modal</p>
    </aqb-modal>
  `,
})
class HostComponent {
  open = false;
  title = 'Confirmar cancelamento';
  closedCount = 0;
  onClosed() {
    this.closedCount++;
  }
}

describe('AqbModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
  });

  it('não renderiza o diálogo quando open é falso', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza o diálogo acessível e o conteúdo projetado quando open é verdadeiro', () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Conteúdo do modal');
    expect(fixture.nativeElement.textContent).toContain('Confirmar cancelamento');
  });

  it('emite "closed" ao clicar no botão de fechar', () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.aqb-modal__close');

    closeButton.click();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });
});

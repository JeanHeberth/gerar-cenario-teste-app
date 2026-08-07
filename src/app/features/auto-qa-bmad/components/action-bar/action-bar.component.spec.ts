import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionBarComponent } from './action-bar.component';

describe('ActionBarComponent', () => {
  let fixture: ComponentFixture<ActionBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ActionBarComponent] });
    fixture = TestBed.createComponent(ActionBarComponent);
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.action-bar__item'));
  }

  it('renderiza um botão por ação recebida, exatamente na ordem recebida', () => {
    fixture.componentRef.setInput('availableActions', ['START', 'CANCEL']);
    fixture.detectChanges();

    const items = buttons();
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Iniciar');
    expect(items[1].textContent).toContain('Cancelar');
  });

  it('nunca inventa ações: lista vazia não renderiza nenhum botão', () => {
    fixture.componentRef.setInput('availableActions', []);
    fixture.detectChanges();
    expect(buttons().length).toBe(0);
  });

  it('não esconde nenhuma ação existente, incluindo NONE', () => {
    fixture.componentRef.setInput('availableActions', ['NONE']);
    fixture.detectChanges();
    expect(buttons().length).toBe(1);
  });

  it('toda ação vem desabilitada nesta fase, com a mensagem "Disponível em uma próxima etapa."', () => {
    fixture.componentRef.setInput('availableActions', ['GENERATE']);
    fixture.detectChanges();

    const item = buttons()[0];
    expect(item.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Disponível em uma próxima etapa.');
  });

  it('mostra indicador de carregamento no botão correspondente a pendingAction', () => {
    fixture.componentRef.setInput('availableActions', ['CANCEL']);
    fixture.componentRef.setInput('pendingAction', 'CANCEL');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });
});

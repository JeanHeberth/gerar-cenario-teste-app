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

  it('ações ainda não suportadas (ex.: VIEW_LOGS) permanecem desabilitadas com o aviso', () => {
    fixture.componentRef.setInput('availableActions', ['VIEW_LOGS']);
    fixture.detectChanges();

    const item = buttons()[0];
    expect(item.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Disponível em uma próxima etapa.');
  });

  it('ações funcionais (START/CONTINUE/GENERATE/CANCEL/APPROVE_FILE_UPDATE/APPROVE_EXECUTION/APPLY/EXECUTE) ficam habilitadas, sem o aviso', () => {
    fixture.componentRef.setInput('availableActions', [
      'START',
      'CONTINUE',
      'GENERATE',
      'CANCEL',
      'APPROVE_FILE_UPDATE',
      'APPROVE_EXECUTION',
      'APPLY',
      'EXECUTE',
    ]);
    fixture.detectChanges();

    for (const item of buttons()) {
      expect(item.disabled).toBeFalse();
    }
    expect(fixture.nativeElement.textContent).not.toContain('Disponível em uma próxima etapa.');
  });

  it('emite actionTriggered ao clicar em APPLY quando presente em availableActions', () => {
    fixture.componentRef.setInput('availableActions', ['APPLY']);
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.actionTriggered.subscribe((action) => (emitted = action));

    buttons()[0].click();

    expect(emitted).toBe('APPLY');
  });

  it('emite actionTriggered ao clicar em EXECUTE quando presente em availableActions', () => {
    fixture.componentRef.setInput('availableActions', ['EXECUTE']);
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.actionTriggered.subscribe((action) => (emitted = action));

    buttons()[0].click();

    expect(emitted).toBe('EXECUTE');
  });

  it('emite actionTriggered ao clicar em uma ação funcional', () => {
    fixture.componentRef.setInput('availableActions', ['START']);
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.actionTriggered.subscribe((action) => (emitted = action));

    buttons()[0].click();

    expect(emitted).toBe('START');
  });

  it('não emite actionTriggered ao clicar em uma ação ainda não suportada', () => {
    fixture.componentRef.setInput('availableActions', ['VIEW_LOGS']);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.actionTriggered.subscribe(() => (emitted = true));

    buttons()[0].click();

    expect(emitted).toBeFalse();
  });

  it('mostra indicador de carregamento no botão correspondente a pendingAction', () => {
    fixture.componentRef.setInput('availableActions', ['CANCEL']);
    fixture.componentRef.setInput('pendingAction', 'CANCEL');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('desabilita todos os botões (mesmo funcionais) enquanto qualquer ação estiver pendente', () => {
    fixture.componentRef.setInput('availableActions', ['START', 'CANCEL']);
    fixture.componentRef.setInput('pendingAction', 'START');
    fixture.detectChanges();

    for (const item of buttons()) {
      expect(item.disabled).toBeTrue();
    }
  });
});

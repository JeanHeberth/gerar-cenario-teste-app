import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecuteConfirmModalComponent } from './execute-confirm-modal.component';

describe('ExecuteConfirmModalComponent', () => {
  let fixture: ComponentFixture<ExecuteConfirmModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecuteConfirmModalComponent] });
    fixture = TestBed.createComponent(ExecuteConfirmModalComponent);
  });

  it('não renderiza o diálogo quando open é falso', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza o diálogo informando que o backend executará os testes', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain(
      'Os testes automatizados serão executados pelo backend.'
    );
  });

  it('não renderiza \\n literal no conteúdo do diálogo', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('\\n');
  });

  it('informa que falha dos testes não significa necessariamente falha técnica do sistema', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('pode levar algum tempo');
    expect(fixture.nativeElement.textContent).toContain('resultado será determinado pelo backend');
    expect(fixture.nativeElement.textContent).toContain(
      'Falha dos testes não significa necessariamente falha técnica do sistema.'
    );
  });

  it('emite confirmed ao clicar em confirmar execução', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let confirmed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));

    fixture.nativeElement.querySelector('.execute-confirm-modal__confirm button').click();

    expect(confirmed).toBeTrue();
  });

  it('emite dismissed ao clicar em voltar, sem emitir confirmed', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let confirmed = false;
    let dismissed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    fixture.nativeElement.querySelector('.execute-confirm-modal__dismiss button').click();

    expect(dismissed).toBeTrue();
    expect(confirmed).toBeFalse();
  });

  it('emite dismissed ao fechar o modal pelo botão de fechar', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    fixture.nativeElement.querySelector('.aqb-modal__close').click();

    expect(dismissed).toBeTrue();
  });

  it('desabilita e mostra loading no botão de confirmação enquanto submitting é verdadeiro', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const confirmButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.execute-confirm-modal__confirm button'
    );
    expect(confirmButton.disabled).toBeTrue();
  });
});

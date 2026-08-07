import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplyConfirmModalComponent } from './apply-confirm-modal.component';

describe('ApplyConfirmModalComponent', () => {
  let fixture: ComponentFixture<ApplyConfirmModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApplyConfirmModalComponent] });
    fixture = TestBed.createComponent(ApplyConfirmModalComponent);
  });

  it('não renderiza o diálogo quando open é falso', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza o diálogo com o aviso de que arquivos podem ser alterados', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const dialog: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain(
      'Esta ação poderá criar ou alterar arquivos do projeto.'
    );
  });

  it('não renderiza \\n literal no conteúdo do diálogo', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('\\n');
  });

  it('informa que o frontend não executa alterações localmente', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('aprovação previamente registrada');
    expect(fixture.nativeElement.textContent).toContain('Backup e rollback são responsabilidades do backend');
    expect(fixture.nativeElement.textContent).toContain('frontend não executa nenhuma alteração localmente');
  });

  it('emite confirmed ao clicar em confirmar aplicação', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let confirmed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));

    fixture.nativeElement.querySelector('.apply-confirm-modal__confirm button').click();

    expect(confirmed).toBeTrue();
  });

  it('emite dismissed ao clicar em voltar, sem emitir confirmed', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let confirmed = false;
    let dismissed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    fixture.nativeElement.querySelector('.apply-confirm-modal__dismiss button').click();

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
      '.apply-confirm-modal__confirm button'
    );
    expect(confirmButton.disabled).toBeTrue();
  });
});

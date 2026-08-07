import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CancelConfirmModalComponent } from './cancel-confirm-modal.component';

describe('CancelConfirmModalComponent', () => {
  let fixture: ComponentFixture<CancelConfirmModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CancelConfirmModalComponent] });
    fixture = TestBed.createComponent(CancelConfirmModalComponent);
  });

  it('não renderiza o diálogo quando open é falso', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza o diálogo com campo de motivo opcional quando open é verdadeiro', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
  });

  it('emite confirmed com o motivo digitado ao confirmar', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let emitted: string | undefined;
    fixture.componentInstance.confirmed.subscribe((reason) => (emitted = reason));

    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'Cenário incorreto';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.cancel-confirm-modal__confirm button').click();

    expect(emitted).toBe('Cenário incorreto');
  });

  it('emite confirmed com undefined quando nenhum motivo é informado', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let emitted: string | undefined = 'não deveria permanecer';
    let called = false;
    fixture.componentInstance.confirmed.subscribe((reason) => {
      emitted = reason;
      called = true;
    });

    fixture.nativeElement.querySelector('.cancel-confirm-modal__confirm button').click();

    expect(called).toBeTrue();
    expect(emitted).toBeUndefined();
  });

  it('emite dismissed ao clicar em voltar/fechar, sem emitir confirmed', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let confirmed = false;
    let dismissed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));

    fixture.nativeElement.querySelector('.cancel-confirm-modal__dismiss button').click();

    expect(dismissed).toBeTrue();
    expect(confirmed).toBeFalse();
  });

  it('desabilita o botão de confirmação enquanto submitting é verdadeiro', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const confirmButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.cancel-confirm-modal__confirm button'
    );
    expect(confirmButton.disabled).toBeTrue();
  });
});

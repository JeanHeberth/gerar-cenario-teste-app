import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplyApprovalPanelComponent } from './apply-approval-panel.component';
import { AutoQaApplyApprovalRequest } from '../../models/auto-qa-execution.model';

describe('ApplyApprovalPanelComponent', () => {
  let fixture: ComponentFixture<ApplyApprovalPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ApplyApprovalPanelComponent] });
    fixture = TestBed.createComponent(ApplyApprovalPanelComponent);
    fixture.detectChanges();
  });

  function checkbox(value: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[type="checkbox"][value="${value}"]`);
  }

  function namedCheckbox(name: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`input[type="checkbox"][name="${name}"]`);
  }

  function approvedByField(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.aqb-input__field');
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.apply-approval-panel__submit button');
  }

  it('renderiza approvedBy e as 4 operações autorizáveis (CREATE/UPDATE/REUSE/NONE)', () => {
    expect(approvedByField()).not.toBeNull();
    for (const op of ['CREATE', 'UPDATE', 'REUSE', 'NONE']) {
      expect(checkbox(op)).not.toBeNull();
    }
  });

  it('já vem com CREATE/UPDATE/REUSE marcados e avisos permitidos', () => {
    // Começar tudo vazio obrigava a adivinhar o que marcar, e errar só aparecia
    // como falha no apply, depois do pipeline inteiro.
    expect(checkbox('CREATE').checked).toBeTrue();
    expect(checkbox('UPDATE').checked).toBeTrue();
    expect(checkbox('REUSE').checked).toBeTrue();
    expect(checkbox('NONE').checked).toBeFalse();
    expect(namedCheckbox('allowWarnings').checked).toBeTrue();
    // Sobrescrever arquivo existente continua exigindo escolha explícita.
    expect(namedCheckbox('allowFileUpdate').checked).toBeFalse();
  });

  it('desabilita o envio quando approvedBy está vazio ou nenhuma operação foi selecionada', () => {
    expect(submitButton().disabled).toBeTrue(); // approvedBy vazio

    approvedByField().value = 'jean';
    approvedByField().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submitButton().disabled).toBeFalse();

    for (const op of ['CREATE', 'UPDATE', 'REUSE']) {
      checkbox(op).checked = false;
      checkbox(op).dispatchEvent(new Event('change'));
    }
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue(); // nenhuma operação selecionada
  });

  it('emite approved com o payload correto quando válido', () => {
    approvedByField().value = '  jean  ';
    approvedByField().dispatchEvent(new Event('input'));

    // Desmarca UPDATE/REUSE para checar que o toggle continua funcionando
    // sobre a seleção padrão.
    checkbox('UPDATE').checked = false;
    checkbox('UPDATE').dispatchEvent(new Event('change'));
    checkbox('REUSE').checked = false;
    checkbox('REUSE').dispatchEvent(new Event('change'));

    namedCheckbox('allowFileUpdate').checked = true;
    namedCheckbox('allowFileUpdate').dispatchEvent(new Event('change'));

    fixture.detectChanges();

    let emitted: AutoQaApplyApprovalRequest | undefined;
    fixture.componentInstance.approved.subscribe((v) => (emitted = v));

    submitButton().click();

    expect(emitted).toEqual({
      approvedBy: 'jean',
      authorizedOperations: ['CREATE'],
      allowFileUpdate: true,
      allowWarnings: true,
    });
  });

  it('desabilita o envio enquanto submitting é verdadeiro', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });
});

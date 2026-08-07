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

  it('desabilita o envio quando approvedBy está vazio ou nenhuma operação foi selecionada', () => {
    expect(submitButton().disabled).toBeTrue();

    approvedByField().value = 'jean';
    approvedByField().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue(); // ainda sem operação selecionada
  });

  it('emite approved com o payload correto quando válido', () => {
    approvedByField().value = '  jean  ';
    approvedByField().dispatchEvent(new Event('input'));

    checkbox('CREATE').checked = true;
    checkbox('CREATE').dispatchEvent(new Event('change'));

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
      allowWarnings: false,
    });
  });

  it('desabilita o envio enquanto submitting é verdadeiro', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });
});

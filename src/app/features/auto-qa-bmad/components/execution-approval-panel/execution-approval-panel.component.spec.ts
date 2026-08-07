import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionApprovalPanelComponent } from './execution-approval-panel.component';
import { AutoQaExecutionApprovalRequest } from '../../models/auto-qa-execution.model';

describe('ExecutionApprovalPanelComponent', () => {
  let fixture: ComponentFixture<ExecutionApprovalPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionApprovalPanelComponent] });
    fixture = TestBed.createComponent(ExecutionApprovalPanelComponent);
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
    return fixture.nativeElement.querySelector('.execution-approval-panel__submit button');
  }

  it('renderiza approvedBy e os 11 comandos autorizáveis (ExecutionCommandId)', () => {
    expect(approvedByField()).not.toBeNull();
    const commands = [
      'NPM_TEST',
      'NPM_TEST_E2E',
      'PLAYWRIGHT_TEST',
      'CYPRESS_RUN',
      'CYPRESS_SCRIPT_RUN',
      'GRADLE_WRAPPER_TEST',
      'GRADLE_WRAPPER_CLEAN_TEST',
      'MAVEN_WRAPPER_TEST',
      'MAVEN_TEST',
      'ROBOT_TEST',
      'PYTEST',
    ];
    for (const command of commands) {
      expect(checkbox(command)).withContext(command).not.toBeNull();
    }
  });

  it('desabilita o envio quando approvedBy está vazio ou nenhum comando foi selecionado', () => {
    expect(submitButton().disabled).toBeTrue();

    approvedByField().value = 'jean';
    approvedByField().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });

  it('emite approved com o payload correto quando válido', () => {
    approvedByField().value = '  jean  ';
    approvedByField().dispatchEvent(new Event('input'));

    checkbox('NPM_TEST').checked = true;
    checkbox('NPM_TEST').dispatchEvent(new Event('change'));

    namedCheckbox('allowTestExecution').checked = true;
    namedCheckbox('allowTestExecution').dispatchEvent(new Event('change'));

    fixture.detectChanges();

    let emitted: AutoQaExecutionApprovalRequest | undefined;
    fixture.componentInstance.approved.subscribe((v) => (emitted = v));

    submitButton().click();

    expect(emitted).toEqual({
      approvedBy: 'jean',
      allowedCommands: ['NPM_TEST'],
      allowTestExecution: true,
      allowInstallCommand: false,
      allowBuildCommand: false,
    });
  });

  it('desabilita o envio enquanto submitting é verdadeiro', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });
});

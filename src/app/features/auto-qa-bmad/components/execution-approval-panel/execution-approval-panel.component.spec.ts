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

  it('já vem com os comandos de teste marcados e execução permitida', () => {
    // Escolher entre 11 comandos era adivinhação: marcar o errado fazia o
    // resolvedor não achar comando e devolver BLOCKED, já com os arquivos
    // gerados e aplicados. Autorizar todos não amplia nada, porque o backend
    // só monta candidatos do framework detectado.
    expect(checkbox('PLAYWRIGHT_TEST').checked).toBeTrue();
    expect(checkbox('PYTEST').checked).toBeTrue();
    expect(namedCheckbox('allowTestExecution').checked).toBeTrue();
    // Instalar e buildar são mais pesados e seguem exigindo escolha explícita.
    expect(namedCheckbox('allowInstallCommand').checked).toBeFalse();
    expect(namedCheckbox('allowBuildCommand').checked).toBeFalse();
  });

  it('oferece só os comandos do framework da execução', () => {
    // Num projeto Playwright, oferecer MAVEN_TEST/PYTEST era ruído que levava a
    // marcar o comando errado — e aí o resolvedor não achava nenhum e devolvia
    // BLOCKED, depois de gerar e aplicar os arquivos.
    fixture.componentRef.setInput('frameworks', [
      { framework: 'PLAYWRIGHT', automationTypes: ['WEB_UI', 'API'], commands: ['PLAYWRIGHT_TEST', 'NPM_TEST'] },
      { framework: 'REST_ASSURED', automationTypes: ['API'], commands: ['MAVEN_TEST'] },
    ]);
    fixture.componentRef.setInput('automationFramework', 'PLAYWRIGHT');
    fixture.detectChanges();

    expect(checkbox('PLAYWRIGHT_TEST')).not.toBeNull();
    expect(checkbox('PLAYWRIGHT_TEST').checked).toBeTrue();
    expect(checkbox('NPM_TEST').checked).toBeTrue();
    expect(checkbox('MAVEN_TEST')).toBeNull();
    expect(checkbox('PYTEST')).toBeNull();
  });

  it('sem framework conhecido, mantém os 11 comandos', () => {
    fixture.componentRef.setInput('automationFramework', null);
    fixture.detectChanges();
    expect(checkbox('PLAYWRIGHT_TEST')).not.toBeNull();
    expect(checkbox('MAVEN_TEST')).not.toBeNull();
  });

  it('desabilita o envio quando approvedBy está vazio ou nenhum comando foi selecionado', () => {
    expect(submitButton().disabled).toBeTrue(); // approvedBy vazio

    approvedByField().value = 'jean';
    approvedByField().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(submitButton().disabled).toBeFalse();

    for (const command of fixture.componentInstance['commands']()) {
      checkbox(command).checked = false;
      checkbox(command).dispatchEvent(new Event('change'));
    }
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue(); // nenhum comando selecionado
  });

  it('emite approved com o payload correto quando válido', () => {
    approvedByField().value = '  jean  ';
    approvedByField().dispatchEvent(new Event('input'));

    // Desmarca todos e deixa só NPM_TEST, checando que o toggle continua
    // funcionando sobre a seleção padrão.
    for (const command of fixture.componentInstance['commands']()) {
      if (command === 'NPM_TEST') continue;
      checkbox(command).checked = false;
      checkbox(command).dispatchEvent(new Event('change'));
    }

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

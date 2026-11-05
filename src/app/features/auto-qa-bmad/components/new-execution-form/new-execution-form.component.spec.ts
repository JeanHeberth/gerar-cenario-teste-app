import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewExecutionFormComponent, NewExecutionFormValue } from './new-execution-form.component';

describe('NewExecutionFormComponent', () => {
  let fixture: ComponentFixture<NewExecutionFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NewExecutionFormComponent] });
    fixture = TestBed.createComponent(NewExecutionFormComponent);
    fixture.detectChanges();
  });

  function scenarioField(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea');
  }

  function projectPathField(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  function submitForm(): void {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('renderiza os campos scenario e projectPath com labels', () => {
    expect(scenarioField()).not.toBeNull();
    expect(projectPathField()).not.toBeNull();
  });

  it('não emite "created" e mostra erro quando o formulário é submetido vazio', () => {
    let emitted = false;
    fixture.componentInstance.created.subscribe(() => (emitted = true));

    submitForm();

    expect(emitted).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('obrigatório');
  });

  it('mostra erro quando o cenário é mais curto que o mínimo', () => {
    scenarioField().value = 'curto';
    scenarioField().dispatchEvent(new Event('input'));
    submitForm();

    expect(fixture.nativeElement.querySelector('.aqb-textarea__error')).not.toBeNull();
  });

  it('emite "created" com os valores (com trim) quando o formulário é válido', () => {
    let emitted: NewExecutionFormValue | undefined;
    fixture.componentInstance.created.subscribe((v) => (emitted = v));

    scenarioField().value = '  Dado que o usuário está logado, quando acessa o perfil  ';
    scenarioField().dispatchEvent(new Event('input'));
    projectPathField().value = '  /tmp/projeto  ';
    projectPathField().dispatchEvent(new Event('input'));

    submitForm();

    expect(emitted).toEqual({
      scenario: 'Dado que o usuário está logado, quando acessa o perfil',
      projectPath: '/tmp/projeto',
      cenarioId: undefined,
      automationType: undefined,
      automationFramework: undefined,
    });
  });

  it('emite o canal de automação escolhido', () => {
    fixture.componentRef.setInput('frameworks', [
      { framework: 'PLAYWRIGHT', automationTypes: ['WEB_UI', 'API'] },
    ]);
    fixture.detectChanges();

    let emitted: NewExecutionFormValue | undefined;
    fixture.componentInstance.created.subscribe((v) => (emitted = v));

    scenarioField().value = 'Dado que o usuário está logado, quando acessa o perfil';
    scenarioField().dispatchEvent(new Event('input'));
    projectPathField().value = '/tmp/projeto';
    projectPathField().dispatchEvent(new Event('input'));

    const select = fixture.nativeElement.querySelector('#automationType') as HTMLSelectElement;
    select.value = 'API';
    select.dispatchEvent(new Event('change'));

    submitForm();

    expect(emitted?.automationType).toBe('API');
  });

  it('canais acompanham o framework escolhido (cascata)', () => {
    fixture.componentRef.setInput('frameworks', [
      { framework: 'PLAYWRIGHT', automationTypes: ['WEB_UI', 'API'] },
      { framework: 'REST_ASSURED', automationTypes: ['API'] },
    ]);
    fixture.detectChanges();

    const frameworkSelect = fixture.nativeElement.querySelector('#automationFramework') as HTMLSelectElement;
    frameworkSelect.value = 'REST_ASSURED';
    frameworkSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const canais = Array.from(
      (fixture.nativeElement.querySelector('#automationType') as HTMLSelectElement).options,
    ).map((o) => (o as HTMLOptionElement).value);

    // REST Assured não abre navegador: WEB_UI não pode sequer ser oferecido.
    expect(canais).toEqual(['', 'API']);
  });

  it('trocar de framework limpa um canal que o novo não atende', () => {
    fixture.componentRef.setInput('frameworks', [
      { framework: 'PLAYWRIGHT', automationTypes: ['WEB_UI', 'API'] },
      { framework: 'REST_ASSURED', automationTypes: ['API'] },
    ]);
    fixture.detectChanges();

    const frameworkSelect = fixture.nativeElement.querySelector('#automationFramework') as HTMLSelectElement;
    frameworkSelect.value = 'PLAYWRIGHT';
    frameworkSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const canalSelect = fixture.nativeElement.querySelector('#automationType') as HTMLSelectElement;
    canalSelect.value = 'WEB_UI';
    canalSelect.dispatchEvent(new Event('change'));

    frameworkSelect.value = 'REST_ASSURED';
    frameworkSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    let emitted: NewExecutionFormValue | undefined;
    fixture.componentInstance.created.subscribe((v) => (emitted = v));
    scenarioField().value = 'Dado que o usuário está logado, quando acessa o perfil';
    scenarioField().dispatchEvent(new Event('input'));
    projectPathField().value = '/tmp/projeto';
    projectPathField().dispatchEvent(new Event('input'));
    submitForm();

    expect(emitted?.automationFramework).toBe('REST_ASSURED');
    expect(emitted?.automationType).toBeUndefined();
  });

  it('omite o canal quando o usuário deixa "Detectar pelo projeto"', () => {
    let emitted: NewExecutionFormValue | undefined;
    fixture.componentInstance.created.subscribe((v) => (emitted = v));

    scenarioField().value = 'Dado que o usuário está logado, quando acessa o perfil';
    scenarioField().dispatchEvent(new Event('input'));
    projectPathField().value = '/tmp/projeto';
    projectPathField().dispatchEvent(new Event('input'));

    submitForm();

    expect(emitted?.automationType).toBeUndefined();
  });

  it('desabilita o botão de envio quando submitting é verdadeiro', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });

  it('desabilita o botão de envio quando o formulário está inválido', () => {
    expect(submitButton().disabled).toBeTrue();
  });

  describe('foco no primeiro campo inválido ao submeter (Fase 13.8)', () => {
    it('move o foco para o campo "Cenário de teste" quando ambos os campos estão vazios', () => {
      submitForm();
      expect(document.activeElement).toBe(scenarioField());
    });

    it('move o foco para "Caminho do projeto" quando só o cenário é válido', () => {
      scenarioField().value = 'Dado que o usuário está logado, quando acessa o perfil';
      scenarioField().dispatchEvent(new Event('input'));

      submitForm();

      expect(document.activeElement).toBe(projectPathField());
    });

    it('não move o foco quando o formulário é submetido com sucesso (nenhum campo inválido)', () => {
      scenarioField().value = 'Dado que o usuário está logado, quando acessa o perfil';
      scenarioField().dispatchEvent(new Event('input'));
      projectPathField().value = '/tmp/projeto';
      projectPathField().dispatchEvent(new Event('input'));
      projectPathField().focus();

      submitForm();

      expect(document.activeElement).toBe(projectPathField());
    });
  });
});

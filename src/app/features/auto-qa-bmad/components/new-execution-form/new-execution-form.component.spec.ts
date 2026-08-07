import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewExecutionFormComponent } from './new-execution-form.component';

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
    let emitted: { scenario: string; projectPath: string } | undefined;
    fixture.componentInstance.created.subscribe((v) => (emitted = v));

    scenarioField().value = '  Dado que o usuário está logado, quando acessa o perfil  ';
    scenarioField().dispatchEvent(new Event('input'));
    projectPathField().value = '  /tmp/projeto  ';
    projectPathField().dispatchEvent(new Event('input'));

    submitForm();

    expect(emitted).toEqual({
      scenario: 'Dado que o usuário está logado, quando acessa o perfil',
      projectPath: '/tmp/projeto',
    });
  });

  it('desabilita o botão de envio quando submitting é verdadeiro', () => {
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();
    expect(submitButton().disabled).toBeTrue();
  });

  it('desabilita o botão de envio quando o formulário está inválido', () => {
    expect(submitButton().disabled).toBeTrue();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbTextareaComponent } from './aqb-textarea.component';

describe('AqbTextareaComponent', () => {
  let fixture: ComponentFixture<AqbTextareaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbTextareaComponent] });
    fixture = TestBed.createComponent(AqbTextareaComponent);
    fixture.componentRef.setInput('label', 'Cenário de teste');
  });

  function textarea(): HTMLTextAreaElement {
    return fixture.nativeElement.querySelector('textarea');
  }

  it('associa o label ao textarea via for/id', () => {
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label.getAttribute('for')).toBe(textarea().id);
  });

  it('emite valueChange ao digitar', () => {
    fixture.detectChanges();
    let emitted: string | undefined;
    fixture.componentInstance.valueChange.subscribe((v: string) => (emitted = v));

    textarea().value = 'Dado que o usuário está logado...';
    textarea().dispatchEvent(new Event('input'));

    expect(emitted).toBe('Dado que o usuário está logado...');
  });

  it('exibe a mensagem de erro quando informada', () => {
    fixture.componentRef.setInput('error', 'Campo obrigatório');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-textarea__error')?.textContent?.trim()).toBe(
      'Campo obrigatório'
    );
  });

  it('associa a mensagem de erro ao textarea via aria-describedby (Fase 13.8)', () => {
    fixture.componentRef.setInput('error', 'Campo obrigatório');
    fixture.detectChanges();
    const errorEl = fixture.nativeElement.querySelector('.aqb-textarea__error');
    expect(errorEl.id).toBeTruthy();
    expect(textarea().getAttribute('aria-describedby')).toBe(errorEl.id);
  });

  it('não aponta aria-describedby para nenhum elemento quando não há erro', () => {
    fixture.detectChanges();
    expect(textarea().getAttribute('aria-describedby')).toBeNull();
  });
});

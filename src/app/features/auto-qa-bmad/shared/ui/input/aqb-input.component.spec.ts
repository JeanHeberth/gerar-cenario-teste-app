import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbInputComponent } from './aqb-input.component';

describe('AqbInputComponent', () => {
  let fixture: ComponentFixture<AqbInputComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbInputComponent] });
    fixture = TestBed.createComponent(AqbInputComponent);
    fixture.componentRef.setInput('label', 'Caminho do projeto');
  });

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  it('associa o label ao input via for/id', () => {
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label.getAttribute('for')).toBe(input().id);
    expect(label.textContent.trim()).toBe('Caminho do projeto');
  });

  it('emite valueChange ao digitar', () => {
    fixture.detectChanges();
    let emitted: string | undefined;
    fixture.componentInstance.valueChange.subscribe((v: string) => (emitted = v));

    input().value = '/tmp/projeto';
    input().dispatchEvent(new Event('input'));

    expect(emitted).toBe('/tmp/projeto');
  });

  it('exibe a mensagem de erro e marca aria-invalid quando error é informado', () => {
    fixture.componentRef.setInput('error', 'Campo obrigatório');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.aqb-input__error')?.textContent?.trim()).toBe('Campo obrigatório');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('não marca aria-invalid quando não há erro', () => {
    fixture.detectChanges();
    expect(input().getAttribute('aria-invalid')).toBe('false');
  });
});

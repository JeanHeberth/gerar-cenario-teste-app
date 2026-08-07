import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorListComponent } from './error-list.component';

describe('ErrorListComponent', () => {
  let fixture: ComponentFixture<ErrorListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorListComponent] });
    fixture = TestBed.createComponent(ErrorListComponent);
  });

  it('renderiza um item por erro, com code e message', () => {
    fixture.componentRef.setInput('errors', [
      { code: 'E1', message: 'Falha ao gerar código' },
      { code: 'E2', message: 'Timeout na execução' },
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.error-list__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('E1');
    expect(items[0].textContent).toContain('Falha ao gerar código');
  });

  it('não renderiza itens quando a lista está vazia', () => {
    fixture.componentRef.setInput('errors', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.error-list__item').length).toBe(0);
  });
});

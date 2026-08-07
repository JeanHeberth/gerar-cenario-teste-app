import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WarningListComponent } from './warning-list.component';

describe('WarningListComponent', () => {
  let fixture: ComponentFixture<WarningListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [WarningListComponent] });
    fixture = TestBed.createComponent(WarningListComponent);
  });

  it('renderiza um item por warning, com code e description', () => {
    fixture.componentRef.setInput('warnings', [
      { code: 'W1', description: 'Arquivo já existe', blocking: false },
      { code: 'W2', description: 'Dependência desatualizada', blocking: true },
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.warning-list__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('W1');
    expect(items[0].textContent).toContain('Arquivo já existe');
  });

  it('marca visualmente warnings bloqueantes', () => {
    fixture.componentRef.setInput('warnings', [{ code: 'W1', description: 'aviso', blocking: true }]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.warning-list__item');
    expect(item.classList).toContain('warning-list__item--blocking');
  });

  it('não renderiza itens quando a lista está vazia', () => {
    fixture.componentRef.setInput('warnings', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.warning-list__item').length).toBe(0);
  });
});

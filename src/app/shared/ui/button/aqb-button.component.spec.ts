import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbButtonComponent } from './aqb-button.component';

describe('AqbButtonComponent', () => {
  let fixture: ComponentFixture<AqbButtonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbButtonComponent] });
    fixture = TestBed.createComponent(AqbButtonComponent);
  });

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('usa a variante "primary" por padrão', () => {
    fixture.detectChanges();
    expect(button().classList).toContain('aqb-button--primary');
  });

  it('aplica a variante informada', () => {
    fixture.componentRef.setInput('variant', 'danger');
    fixture.detectChanges();
    expect(button().classList).toContain('aqb-button--danger');
  });

  it('emite "clicked" ao clicar quando habilitado', () => {
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.clicked.subscribe(() => (emitted = true));

    button().click();

    expect(emitted).toBeTrue();
  });

  it('não emite "clicked" quando disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.clicked.subscribe(() => (emitted = true));

    button().click();

    expect(emitted).toBeFalse();
    expect(button().disabled).toBeTrue();
  });

  it('não emite "clicked" quando loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.clicked.subscribe(() => (emitted = true));

    button().click();

    expect(emitted).toBeFalse();
    expect(button().disabled).toBeTrue();
  });
});

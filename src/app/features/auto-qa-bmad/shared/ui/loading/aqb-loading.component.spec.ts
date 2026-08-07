import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbLoadingComponent } from './aqb-loading.component';

describe('AqbLoadingComponent', () => {
  let fixture: ComponentFixture<AqbLoadingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbLoadingComponent] });
    fixture = TestBed.createComponent(AqbLoadingComponent);
  });

  it('expõe role="status" para leitores de tela', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
  });

  it('exibe o label informado', () => {
    fixture.componentRef.setInput('label', 'Carregando execuções...');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carregando execuções...');
  });
});

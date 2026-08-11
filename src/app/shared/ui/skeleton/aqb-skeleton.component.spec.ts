import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbSkeletonComponent } from './aqb-skeleton.component';

describe('AqbSkeletonComponent', () => {
  let fixture: ComponentFixture<AqbSkeletonComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbSkeletonComponent] });
    fixture = TestBed.createComponent(AqbSkeletonComponent);
  });

  it('renderiza 1 bloco por padrão, variante "text"', () => {
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('.aqb-skeleton__item');
    expect(items.length).toBe(1);
    expect(items[0].classList).toContain('aqb-skeleton__item--text');
  });

  it('renderiza a quantidade de blocos informada em count', () => {
    fixture.componentRef.setInput('count', 4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.aqb-skeleton__item').length).toBe(4);
  });

  it('aplica a variante "block" quando informada', () => {
    fixture.componentRef.setInput('variant', 'block');
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.aqb-skeleton__item');
    expect(item.classList).toContain('aqb-skeleton__item--block');
  });
});

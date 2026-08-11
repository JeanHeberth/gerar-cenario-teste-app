import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbDividerComponent } from './aqb-divider.component';

describe('AqbDividerComponent', () => {
  let fixture: ComponentFixture<AqbDividerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AqbDividerComponent] });
    fixture = TestBed.createComponent(AqbDividerComponent);
    fixture.detectChanges();
  });

  it('renderiza um separador semântico (hr)', () => {
    const hr = fixture.nativeElement.querySelector('hr');
    expect(hr).not.toBeNull();
    expect(hr.classList).toContain('aqb-divider');
  });
});

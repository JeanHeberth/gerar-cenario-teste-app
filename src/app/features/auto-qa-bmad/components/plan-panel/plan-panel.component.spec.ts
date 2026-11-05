import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanPanelComponent } from './plan-panel.component';
import { AutoQaPublicPlan } from '../../models/auto-qa-execution.model';

/**
 * Spec: o portão de aprovação precisa mostrar O QUE será gerado.
 *
 * Sem isso o usuário aprovava "Aprovar e gerar código" às cegas, e as
 * advertências da auditoria de reuso — feitas para informar essa decisão —
 * não chegavam a ele.
 */
describe('PlanPanelComponent', () => {
  let fixture: ComponentFixture<PlanPanelComponent>;

  const plano: AutoQaPublicPlan = {
    title: 'Plano de login',
    strategy: 'Cobrir 200, 401 e 400',
    fileActions: [
      { relativePath: 'tests/api/auth/login.spec.ts', operation: 'CREATE', componentType: 'TEST', reason: 'cobrir autenticação' },
      { relativePath: 'playwright.config.ts', operation: 'REUSE', componentType: 'CONFIGURATION', reason: 'já configurado' },
    ],
    warnings: [
      { code: 'POSSIVEL_DUPLICACAO', description: 'authApiClient.ts já existe em tests/api/shared', requiresHumanDecision: true },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PlanPanelComponent] });
    fixture = TestBed.createComponent(PlanPanelComponent);
  });

  it('não renderiza nada quando ainda não há plano', () => {
    fixture.componentRef.setInput('plan', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.plan-panel')).toBeNull();
  });

  it('mostra título e estratégia do plano', () => {
    fixture.componentRef.setInput('plan', plano);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Plano de login');
    expect(texto).toContain('Cobrir 200, 401 e 400');
  });

  it('lista uma linha por arquivo planejado, com caminho e operação', () => {
    fixture.componentRef.setInput('plan', plano);
    fixture.detectChanges();

    const linhas = fixture.nativeElement.querySelectorAll('.plan-panel__action');
    expect(linhas.length).toBe(2);
    expect(linhas[0].textContent).toContain('tests/api/auth/login.spec.ts');
    expect(linhas[0].textContent).toContain('CREATE');
    expect(linhas[0].textContent).toContain('cobrir autenticação');
  });

  it('destaca advertência que exige decisão humana', () => {
    fixture.componentRef.setInput('plan', plano);
    fixture.detectChanges();

    const aviso = fixture.nativeElement.querySelector('.plan-panel__warning');
    expect(aviso.textContent).toContain('POSSIVEL_DUPLICACAO');
    expect(aviso.textContent).toContain('já existe em tests/api/shared');
    expect(aviso.classList).toContain('plan-panel__warning--decision');
  });
});

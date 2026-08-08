import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExecutionStatusHeaderComponent } from './execution-status-header.component';
import { AutoQaWorkflowStatus } from '../../models/auto-qa-enums.model';

describe('ExecutionStatusHeaderComponent', () => {
  let fixture: ComponentFixture<ExecutionStatusHeaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ExecutionStatusHeaderComponent] });
    fixture = TestBed.createComponent(ExecutionStatusHeaderComponent);
  });

  function setStatus(status: AutoQaWorkflowStatus): void {
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
  }

  it('exibe role="status" com o label no aria-label', () => {
    setStatus('COMPLETED');
    const el: HTMLElement = fixture.nativeElement.querySelector('[role="status"]');
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Concluída');
  });

  it('COMPLETED exibe texto "Concluída" e a descrição', () => {
    setStatus('COMPLETED');
    expect(fixture.nativeElement.textContent).toContain('Concluída');
    expect(fixture.nativeElement.textContent).toContain('A execução terminou com sucesso.');
  });

  it('FAILED exibe texto "Falhou" e a descrição', () => {
    setStatus('FAILED');
    expect(fixture.nativeElement.textContent).toContain('Falhou');
    expect(fixture.nativeElement.textContent).toContain('A execução terminou com falhas funcionais.');
  });

  it('CANCELLED exibe texto "Cancelada" e a descrição', () => {
    setStatus('CANCELLED');
    expect(fixture.nativeElement.textContent).toContain('Cancelada');
    expect(fixture.nativeElement.textContent).toContain('A execução foi cancelada pelo usuário.');
  });

  it('WAITING_APPLY_APPROVAL (WAITING) exibe texto "Aguardando aprovação" e a descrição, sem soar como erro técnico', () => {
    setStatus('WAITING_APPLY_APPROVAL');
    expect(fixture.nativeElement.textContent).toContain('Aguardando aprovação');
    expect(fixture.nativeElement.textContent).toContain('A execução está aguardando aprovação humana para continuar.');
    expect(fixture.nativeElement.textContent).not.toContain('Interrompida');
    expect(fixture.nativeElement.textContent).not.toContain('Bloqueada');
  });

  it('RUNNING (IN_PROGRESS) exibe texto "Em andamento" e a descrição', () => {
    setStatus('RUNNING');
    expect(fixture.nativeElement.textContent).toContain('Em andamento');
    expect(fixture.nativeElement.textContent).toContain('A execução ainda está em andamento.');
  });

  it('renderiza um ícone (svg) além do texto — nunca depende só de cor', () => {
    setStatus('FAILED');
    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
  });

  it('o ícone é puramente decorativo (aria-hidden)', () => {
    setStatus('FAILED');
    const icon = fixture.nativeElement.querySelector('.execution-status-header__icon');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('troca o ícone/texto ao trocar o status (todos os 5 estados renderizam sem erro)', () => {
    const statuses: AutoQaWorkflowStatus[] = [
      'CREATED',
      'RUNNING',
      'WAITING_GENERATION_APPROVAL',
      'WAITING_APPLY_APPROVAL',
      'WAITING_EXECUTION_APPROVAL',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
    ];
    for (const status of statuses) {
      expect(() => setStatus(status)).not.toThrow();
      expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
    }
  });
});

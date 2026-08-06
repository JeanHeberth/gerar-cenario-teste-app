import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AutoqaArtifactsComponent } from './autoqa-artifacts.component';
import { AutoQaService } from '../services/autoqa.service';

describe('AutoqaArtifactsComponent', () => {
  let component: AutoqaArtifactsComponent;
  let fixture: ComponentFixture<AutoqaArtifactsComponent>;
  let autoQaServiceSpy: jasmine.SpyObj<AutoQaService>;

  beforeEach(async () => {
    autoQaServiceSpy = jasmine.createSpyObj<AutoQaService>('AutoQaService', [
      'selectProjectFolder',
      'validateProjectPath',
      'analyze',
      'getExecution',
      'applyFiles',
      'generate',
      'execute',
      'discard',
      'getManifest',
      'getGeneratedFiles',
      'getFileContent',
      'downloadFileUrl',
      'downloadZipUrl',
    ]);

    autoQaServiceSpy.selectProjectFolder.and.returnValue(
      of({
        selected: true,
        cancelled: false,
        projectPath: '/Users/test/automation',
        validation: null,
      })
    );

    autoQaServiceSpy.validateProjectPath.and.returnValue(
      of({
        valid: true,
        normalizedPath: '/Users/test/automation',
        readable: true,
        writable: true,
        detectedFramework: 'PLAYWRIGHT',
        detectedLanguage: 'TYPESCRIPT',
        packageManager: 'NPM',
        configurationFile: 'playwright.config.ts',
        warnings: [],
      })
    );

    await TestBed.configureTestingModule({
      imports: [AutoqaArtifactsComponent],
      providers: [{ provide: AutoQaService, useValue: autoQaServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AutoqaArtifactsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve preencher automaticamente o campo após selecionar pasta', async () => {
    await component.chooseProjectFolder();

    expect(component.form.controls.projectPath.value).toBe('/Users/test/automation');
  });

  it('deve chamar validação automaticamente após selecionar pasta', async () => {
    await component.chooseProjectFolder();

    expect(autoQaServiceSpy.validateProjectPath).toHaveBeenCalledWith('/Users/test/automation');
  });

  it('não deve alterar campo quando usuário cancelar', async () => {
    component.form.controls.projectPath.setValue('/anterior');
    autoQaServiceSpy.selectProjectFolder.and.returnValue(
      of({
        selected: false,
        cancelled: true,
        projectPath: null,
        validation: null,
      })
    );

    await component.chooseProjectFolder();

    expect(component.form.controls.projectPath.value).toBe('/anterior');
    expect(autoQaServiceSpy.validateProjectPath).not.toHaveBeenCalledWith('/anterior');
  });

  it('deve disparar seleção ao clicar em "📁 Escolher pasta"', async () => {
    const chooseSpy = spyOn(component, 'chooseProjectFolder').and.callThrough();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find((el) =>
      (el.textContent ?? '').includes('Escolher pasta')
    ) ?? null;

    expect(button).not.toBeNull();
    button?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chooseSpy).toHaveBeenCalled();
    expect(autoQaServiceSpy.selectProjectFolder).toHaveBeenCalled();
  });

  it('deve limitar linguagens compatíveis ao framework selecionado', () => {
    component.form.controls.framework.setValue('SELENIDE');
    component.form.controls.language.setValue('TYPESCRIPT');

    component.onFrameworkChange();

    expect(component.filteredLanguages).toEqual(['JAVA']);
    expect(component.form.controls.language.value).toBe('JAVA');
  });

  it('deve manter linguagem quando já for compatível com o framework', () => {
    component.form.controls.framework.setValue('PLAYWRIGHT');
    component.form.controls.language.setValue('JAVASCRIPT');

    component.onFrameworkChange();

    expect(component.filteredLanguages).toEqual(['TYPESCRIPT', 'JAVASCRIPT']);
    expect(component.form.controls.language.value).toBe('JAVASCRIPT');
  });
});

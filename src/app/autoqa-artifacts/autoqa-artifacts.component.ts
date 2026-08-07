import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AutoQaService } from '../services/autoqa.service';
import {
  AutoQaMode,
  AutoQaRequest,
  AutoQaResponse,
  AutoQaStatus,
  AutomationFramework,
  AutomationLanguage,
  AutomationPlan,
  AutomationType,
  FileToApply,
  GeneratedFileMetadata,
  ManifestResponse,
  ProjectValidationResponse,
} from '../models/autoqa.interface';

type StepDefinition = {
  label: string;
  statusReachedAt: AutoQaStatus;
};

type AutoQaForm = FormGroup<{
  title: FormControl<string>;
  scenarioMode: FormControl<'text' | 'id'>;
  scenarioId: FormControl<string>;
  scenarioText: FormControl<string>;
  projectPath: FormControl<string>;
  automationType: FormControl<AutomationType>;
  framework: FormControl<AutomationFramework>;
  language: FormControl<AutomationLanguage>;
  mode: FormControl<AutoQaMode>;
  allowFileUpdate: FormControl<boolean>;
  executeAfterGeneration: FormControl<boolean>;
}>;

@Component({
  selector: 'app-autoqa-artifacts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './autoqa-artifacts.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./autoqa-artifacts.component.css'],
})
export class AutoqaArtifactsComponent {
  readonly frameworks: AutomationFramework[] = [
    'PLAYWRIGHT',
    'CYPRESS',
    'SELENIUM',
    'SELENIDE',
    'ROBOT_FRAMEWORK',
    'REST_ASSURED',
    'UNKNOWN',
  ];
  readonly compatibleLanguagesByFramework: Record<AutomationFramework, AutomationLanguage[]> = {
    PLAYWRIGHT: ['TYPESCRIPT', 'JAVASCRIPT'],
    CYPRESS: ['TYPESCRIPT', 'JAVASCRIPT'],
    SELENIUM: ['JAVA', 'PYTHON', 'CSHARP', 'JAVASCRIPT'],
    SELENIDE: ['JAVA'],
    ROBOT_FRAMEWORK: ['ROBOT', 'PYTHON'],
    REST_ASSURED: ['JAVA'],
    UNKNOWN: ['TYPESCRIPT', 'JAVASCRIPT', 'JAVA', 'PYTHON', 'CSHARP', 'ROBOT', 'UNKNOWN'],
  };

  readonly languages: AutomationLanguage[] = [
    'TYPESCRIPT',
    'JAVASCRIPT',
    'JAVA',
    'PYTHON',
    'CSHARP',
    'ROBOT',
    'UNKNOWN',
  ];

  readonly automationTypes: AutomationType[] = ['WEB', 'API', 'MOBILE', 'DESKTOP'];
  readonly modes: AutoQaMode[] = ['PLAN_ONLY', 'GENERATE_FOR_REVIEW', 'GENERATE_AND_EXECUTE'];

  readonly steps: StepDefinition[] = [
    { label: 'Projeto', statusReachedAt: 'DISCOVERING_PROJECT' },
    { label: 'Descoberta', statusReachedAt: 'PROJECT_DISCOVERED' },
    { label: 'Análise', statusReachedAt: 'PROJECT_ANALYZED' },
    { label: 'Plano', statusReachedAt: 'PLAN_READY' },
    { label: 'Geração', statusReachedAt: 'CODE_GENERATED' },
    { label: 'Revisão', statusReachedAt: 'REVIEW_APPROVED' },
    { label: 'Aplicação', statusReachedAt: 'APPLYING_FILES' },
    { label: 'Execução', statusReachedAt: 'EXECUTION_SUCCESS' },
    { label: 'Resultado', statusReachedAt: 'FINISHED' },
  ];

  readonly statusOrder: Record<AutoQaStatus, number> = {
    CREATED: 1,
    DISCOVERING_PROJECT: 2,
    PROJECT_DISCOVERED: 3,
    ANALYZING_PROJECT: 4,
    PROJECT_ANALYZED: 5,
    PLANNING: 6,
    PLAN_READY: 7,
    GENERATING: 8,
    CODE_GENERATED: 9,
    REVIEWING: 10,
    REVIEW_APPROVED: 11,
    REVIEW_REJECTED: 11,
    WAITING_USER_APPROVAL: 12,
    APPLYING_FILES: 13,
    EXECUTING: 14,
    EXECUTION_SUCCESS: 15,
    EXECUTION_FAILED: 15,
    ANALYZING_FAILURE: 16,
    FINISHED: 17,
    ERROR: 17,
  };

  form: AutoQaForm;

  validatingPath = false;
  selectingFolder = false;
  analyzing = false;
  loadingExecution = false;
  loadingManifest = false;
  applyingFiles = false;
  loadingPreview = false;

  message: string | null = null;
  error: string | null = null;

  pathValidation: ProjectValidationResponse | null = null;
  execution: AutoQaResponse | null = null;
  manifest: ManifestResponse | null = null;
  generatedFiles: GeneratedFileMetadata[] = [];
  previewContent: string | null = null;
  previewFilePath: string | null = null;
  executionIdInput = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly autoQaService: AutoQaService
  ) {
    this.form = new FormGroup({
      title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      scenarioMode: new FormControl<'text' | 'id'>('text', { nonNullable: true }),
      scenarioId: new FormControl('', { nonNullable: true }),
      scenarioText: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      projectPath: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      automationType: new FormControl<AutomationType>('WEB', { nonNullable: true }),
      framework: new FormControl<AutomationFramework>('PLAYWRIGHT', { nonNullable: true }),
      language: new FormControl<AutomationLanguage>('TYPESCRIPT', { nonNullable: true }),
      mode: new FormControl<AutoQaMode>('GENERATE_FOR_REVIEW', { nonNullable: true }),
      allowFileUpdate: new FormControl(false, { nonNullable: true }),
      executeAfterGeneration: new FormControl(false, { nonNullable: true }),
    });
    this.onScenarioModeChange();
    this.onFrameworkChange();
  }

  get currentStatus(): AutoQaStatus | null {
    return this.execution?.status ?? null;
  }

  get plan(): AutomationPlan | null {
    return this.execution?.automationPlan ?? null;
  }

  get hasScenarioTextMode(): boolean {
    return this.form.controls.scenarioMode.value === 'text';
  }

  get fileItems(): GeneratedFileMetadata[] {
    return this.generatedFiles;
  }

  get filteredLanguages(): AutomationLanguage[] {
    const framework = this.form.controls.framework.value;
    return this.compatibleLanguagesByFramework[framework] ?? this.languages;
  }

  onScenarioModeChange(): void {
    if (this.hasScenarioTextMode) {
      this.form.controls.scenarioText.setValidators([Validators.required]);
      this.form.controls.scenarioId.clearValidators();
    } else {
      this.form.controls.scenarioId.setValidators([Validators.required]);
      this.form.controls.scenarioText.clearValidators();
    }
    this.form.controls.scenarioId.updateValueAndValidity();
    this.form.controls.scenarioText.updateValueAndValidity();
  }

  onFrameworkChange(): void {
    const allowedLanguages = this.filteredLanguages;
    const currentLanguage = this.form.controls.language.value;
    if (!allowedLanguages.includes(currentLanguage)) {
      this.form.controls.language.setValue(allowedLanguages[0] ?? 'UNKNOWN');
    }
  }

  async validatePath(pathOverride?: string): Promise<void> {
    const path = (pathOverride ?? this.form.controls.projectPath.value).trim();
    if (!path) {
      this.error = 'Informe o caminho do projeto.';
      return;
    }

    this.clearFeedback();
    this.validatingPath = true;
    try {
      this.pathValidation = await firstValueFrom(this.autoQaService.validateProjectPath(path));
      if (this.pathValidation.valid) {
        if (this.pathValidation.normalizedPath) {
          this.form.controls.projectPath.setValue(this.pathValidation.normalizedPath);
        }
        this.applyDetectedSettings(this.pathValidation);
        this.message = this.buildValidationSuccessMessage(this.pathValidation);
      } else {
        this.error = this.pathValidation.warnings?.join(' | ') || 'Caminho inválido.';
      }
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao validar caminho.');
      this.pathValidation = null;
    } finally {
      this.validatingPath = false;
    }
  }

  async chooseProjectFolder(): Promise<void> {
    this.clearFeedback();
    this.selectingFolder = true;
    try {
      const selection = await firstValueFrom(this.autoQaService.selectProjectFolder());
      if (selection.cancelled || !selection.selected || !selection.projectPath) {
        this.message = 'Seleção de pasta cancelada.';
        return;
      }

      this.form.controls.projectPath.setValue(selection.projectPath);
      await this.validatePath(selection.projectPath);
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao selecionar pasta.');
    } finally {
      this.selectingFolder = false;
    }
  }

  async analyzeProject(): Promise<void> {
    this.onScenarioModeChange();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error = 'Preencha os campos obrigatórios para iniciar a análise.';
      return;
    }

    this.clearFeedback();
    this.analyzing = true;

    const payload: AutoQaRequest = {
      title: this.form.controls.title.value.trim(),
      scenarioId: this.hasScenarioTextMode ? null : this.form.controls.scenarioId.value.trim(),
      scenarioText: this.hasScenarioTextMode ? this.form.controls.scenarioText.value.trim() : null,
      projectPath: this.form.controls.projectPath.value.trim(),
      framework: this.nullableEnum(this.form.controls.framework.value),
      language: this.nullableEnum(this.form.controls.language.value),
      automationType: this.nullableEnum(this.form.controls.automationType.value),
      mode: this.nullableEnum(this.form.controls.mode.value),
      executeAfterGeneration: this.form.controls.executeAfterGeneration.value,
      allowFileUpdate: this.form.controls.allowFileUpdate.value,
    };

    try {
      this.execution = await firstValueFrom(this.autoQaService.analyze(payload));
      this.executionIdInput = this.execution.executionId ?? '';
      this.message = 'Análise concluída. Plano técnico carregado.';
      this.previewContent = null;
      this.previewFilePath = null;
      this.manifest = null;
      this.generatedFiles = [];
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao analisar projeto.');
      this.execution = null;
    } finally {
      this.analyzing = false;
    }
  }

  async loadExecution(): Promise<void> {
    const executionId = this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'Informe o executionId.';
      return;
    }
    this.clearFeedback();
    this.loadingExecution = true;
    try {
      this.execution = await firstValueFrom(this.autoQaService.getExecution(executionId));
      this.generatedFiles = this.execution.generatedFiles ?? [];
      this.message = 'Execução carregada.';
    } catch (e) {
      this.error = this.extractError(e, 'Não foi possível carregar a execução.');
      this.execution = null;
    } finally {
      this.loadingExecution = false;
    }
  }

  async loadGeneratedFiles(): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'Informe ou carregue uma execução antes de visualizar arquivos.';
      return;
    }

    this.clearFeedback();
    this.loadingManifest = true;
    try {
      this.generatedFiles = await firstValueFrom(this.autoQaService.getGeneratedFiles(executionId));
      if (this.generatedFiles.length === 0 && this.execution?.generatedFiles?.length) {
        this.generatedFiles = this.execution.generatedFiles;
      }
      this.message = 'Arquivos gerados carregados.';
    } catch (e) {
      this.error = this.extractError(e, 'Não foi possível carregar a lista de arquivos.');
      this.manifest = null;
      this.generatedFiles = [];
    } finally {
      this.loadingManifest = false;
    }
  }

  async previewFile(relativePath: string): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId não encontrado para carregar o arquivo.';
      return;
    }

    this.clearFeedback();
    this.loadingPreview = true;
    try {
      this.previewContent = await firstValueFrom(this.autoQaService.getFileContent(executionId, relativePath));
      this.previewFilePath = relativePath;
    } catch (e) {
      this.error = this.extractError(e, 'Não foi possível carregar o conteúdo do arquivo.');
      this.previewContent = null;
      this.previewFilePath = null;
    } finally {
      this.loadingPreview = false;
    }
  }

  downloadFile(relativePath: string): void {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId não encontrado para download.';
      return;
    }
    const url = this.autoQaService.downloadFileUrl(executionId, relativePath);
    window.open(url, '_blank');
  }

  downloadZip(): void {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId não encontrado para download do ZIP.';
      return;
    }
    const url = this.autoQaService.downloadZipUrl(executionId);
    window.open(url, '_blank');
  }

  async applyGeneratedFiles(): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId obrigatório para aplicar arquivos.';
      return;
    }

    if (!this.fileItems.length) {
      this.error = 'Carregue o manifest antes de aplicar arquivos.';
      return;
    }

    this.clearFeedback();
    this.applyingFiles = true;
    try {
      const files = await this.buildFilesToApply(executionId, this.fileItems);
      if (!files.length) {
        this.error = 'Nenhum arquivo de texto disponível para aplicação.';
        return;
      }
      const result = await firstValueFrom(this.autoQaService.applyFiles(executionId, files));
      this.message = result.message || 'Arquivos aplicados com sucesso.';
      await this.loadExecution();
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao aplicar arquivos.');
    } finally {
      this.applyingFiles = false;
    }
  }

  async generateCode(): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId obrigatório para gerar código.';
      return;
    }
    this.clearFeedback();
    this.analyzing = true;
    try {
      this.execution = await firstValueFrom(this.autoQaService.generate(executionId));
      this.executionIdInput = this.execution.executionId;
      this.message = 'Geração concluída.';
      await this.loadGeneratedFiles();
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao gerar código.');
    } finally {
      this.analyzing = false;
    }
  }

  async executeTests(): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId obrigatório para executar teste.';
      return;
    }
    this.clearFeedback();
    this.loadingExecution = true;
    try {
      this.execution = await firstValueFrom(this.autoQaService.execute(executionId));
      this.executionIdInput = this.execution.executionId;
      this.message = 'Execução concluída.';
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao executar teste.');
    } finally {
      this.loadingExecution = false;
    }
  }

  async discardExecution(): Promise<void> {
    const executionId = this.execution?.executionId ?? this.executionIdInput.trim();
    if (!executionId) {
      this.error = 'ExecutionId obrigatório para descartar.';
      return;
    }
    this.clearFeedback();
    this.loadingExecution = true;
    try {
      this.execution = await firstValueFrom(this.autoQaService.discard(executionId));
      this.executionIdInput = this.execution.executionId;
      this.message = 'Execução descartada.';
    } catch (e) {
      this.error = this.extractError(e, 'Falha ao descartar execução.');
    } finally {
      this.loadingExecution = false;
    }
  }

  stepState(step: StepDefinition): 'done' | 'current' | 'pending' {
    const status = this.currentStatus;
    if (!status) {
      return 'pending';
    }

    const currentRank = this.statusOrder[status];
    const stepRank = this.statusOrder[step.statusReachedAt];

    if (status === 'ERROR' && step.statusReachedAt === 'FINISHED') {
      return 'current';
    }
    if (currentRank > stepRank) {
      return 'done';
    }
    if (currentRank === stepRank) {
      return 'current';
    }
    return 'pending';
  }

  listValue(list: string[] | undefined): string {
    if (!list || list.length === 0) {
      return '—';
    }
    return list.join(', ');
  }

  private async buildFilesToApply(
    executionId: string,
    files: GeneratedFileMetadata[]
  ): Promise<FileToApply[]> {
    const payload: FileToApply[] = [];
    for (const file of files) {
      if (!file.relativePath) {
        continue;
      }
      const content = await firstValueFrom(this.autoQaService.getFileContent(executionId, file.relativePath));
      payload.push({
        relativePath: file.relativePath,
        operation: file.operation && file.operation !== 'DELETE' ? file.operation : 'CREATE',
        content,
        generatedHash: file.generatedHash || file.hash || null,
        originalHash: null,
      });
    }
    return payload;
  }

  commandLabel(command: { executable?: string; args?: string[] } | undefined): string {
    if (!command) {
      return '—';
    }
    const args = command.args?.join(' ') ?? '';
    return `${command.executable ?? ''} ${args}`.trim();
  }

  totalMethods(): number {
    const classes = this.execution?.projectAnalysis?.classes ?? [];
    return classes.reduce((acc, c) => acc + (c.methods?.length ?? 0), 0);
  }

  discoveredCommands(): string[] {
    const commands = this.execution?.discoveryResult?.suggestedCommands ?? [];
    return commands.map((c) => this.commandLabel(c));
  }

  private applyDetectedSettings(validation: ProjectValidationResponse): void {
    if (validation.detectedFramework && validation.detectedFramework !== 'UNKNOWN') {
      this.form.controls.framework.setValue(validation.detectedFramework);
      this.onFrameworkChange();
    }
    if (
      validation.detectedLanguage &&
      validation.detectedLanguage !== 'UNKNOWN' &&
      this.filteredLanguages.includes(validation.detectedLanguage)
    ) {
      this.form.controls.language.setValue(validation.detectedLanguage);
    }
  }

  private buildValidationSuccessMessage(validation: ProjectValidationResponse): string {
    const config = validation.configurationFile ?? 'não encontrado';
    const packageManager = validation.packageManager ?? 'UNKNOWN';
    const framework = validation.detectedFramework ?? 'UNKNOWN';
    const language = validation.detectedLanguage ?? 'UNKNOWN';
    return [
      '✔ Projeto localizado',
      `✔ Framework detectado: ${framework}`,
      `✔ Linguagem detectada: ${language}`,
      `✔ Package Manager: ${packageManager}`,
      `✔ Arquivo de configuração encontrado: ${config}`,
    ].join(' | ');
  }

  private clearFeedback(): void {
    this.error = null;
    this.message = null;
  }

  private nullableEnum<T extends string>(value: T | '' | null): T | null {
    if (!value) {
      return null;
    }
    return value;
  }

  private extractError(error: unknown, fallback: string): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: unknown }).error === 'object'
    ) {
      const backendError = (error as { error?: { message?: string } }).error;
      if (backendError?.message) {
        return backendError.message;
      }
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: string }).message;
      if (message) {
        return message;
      }
    }
    return fallback;
  }
}

export type AutomationFramework =
  | 'PLAYWRIGHT'
  | 'CYPRESS'
  | 'SELENIUM'
  | 'SELENIDE'
  | 'ROBOT_FRAMEWORK'
  | 'REST_ASSURED'
  | 'UNKNOWN';

export type AutomationLanguage =
  | 'TYPESCRIPT'
  | 'JAVASCRIPT'
  | 'JAVA'
  | 'PYTHON'
  | 'CSHARP'
  | 'ROBOT'
  | 'UNKNOWN';

export type AutomationType = 'WEB' | 'API' | 'MOBILE' | 'DESKTOP';
export type PackageManager = 'NPM' | 'YARN' | 'PNPM' | 'UNKNOWN';

export type AutoQaMode = 'PLAN_ONLY' | 'GENERATE_FOR_REVIEW' | 'GENERATE_AND_EXECUTE';

export type AutoQaStatus =
  | 'CREATED'
  | 'DISCOVERING_PROJECT'
  | 'PROJECT_DISCOVERED'
  | 'ANALYZING_PROJECT'
  | 'PROJECT_ANALYZED'
  | 'PLANNING'
  | 'PLAN_READY'
  | 'GENERATING'
  | 'CODE_GENERATED'
  | 'REVIEWING'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REJECTED'
  | 'WAITING_USER_APPROVAL'
  | 'APPLYING_FILES'
  | 'EXECUTING'
  | 'EXECUTION_SUCCESS'
  | 'EXECUTION_FAILED'
  | 'ANALYZING_FAILURE'
  | 'FINISHED'
  | 'ERROR';

export type GeneratedFileOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ProjectValidationResponse {
  valid: boolean;
  normalizedPath: string | null;
  readable: boolean;
  writable: boolean;
  detectedFramework: AutomationFramework | null;
  detectedLanguage: AutomationLanguage | null;
  packageManager: PackageManager | null;
  configurationFile: string | null;
  warnings: string[];
}

export interface ProjectFolderSelectionResponse {
  selected: boolean;
  cancelled: boolean;
  projectPath: string | null;
  validation: ProjectValidationResponse | null;
}

export interface AutoQaRequest {
  title: string;
  scenarioId: string | null;
  scenarioText: string | null;
  projectPath: string;
  framework: AutomationFramework | null;
  language: AutomationLanguage | null;
  automationType: AutomationType | null;
  mode: AutoQaMode | null;
  executeAfterGeneration: boolean;
  allowFileUpdate: boolean;
}

export interface AllowedCommand {
  logicalName?: string;
  executable?: string;
  args?: string[];
  description?: string;
}

export interface WorkflowIssue {
  step?: string;
  code?: string;
  message?: string;
  severity?: string;
  suggestion?: string;
}

export interface MethodParameter {
  name?: string;
  type?: string;
}

export interface MethodInfo {
  name?: string;
  parameters?: MethodParameter[];
  returnType?: string;
  async?: boolean;
  visibility?: string;
  lineNumber?: number;
  sourceFile?: string;
}

export interface ClassInfo {
  name?: string;
  type?: string;
  methods?: MethodInfo[];
  importStatements?: string[];
  sourceFile?: string;
}

export interface ProjectDiscoveryResult {
  informedFramework?: AutomationFramework;
  detectedFramework?: AutomationFramework;
  informedLanguage?: AutomationLanguage;
  detectedLanguage?: AutomationLanguage;
  packageManager?: PackageManager;
  configurationFile?: string;
  suggestedCommands?: AllowedCommand[];
  detectionEvidences?: string[];
  divergences?: string[];
  warnings?: string[];
}

export interface ProjectAnalysisResult {
  classes?: ClassInfo[];
  pageObjects?: ClassInfo[];
  testFiles?: string[];
  fixtureFiles?: string[];
  helperFiles?: string[];
  customCommands?: string[];
  describeBlocks?: string[];
  testCases?: string[];
  conventions?: string[];
  gaps?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface CodeReviewIssue {
  severity?: 'INFO' | 'WARNING' | 'ERROR';
  file?: string;
  line?: number;
  code?: string;
  message?: string;
  suggestion?: string;
}

export interface CodeReviewResult {
  approved: boolean;
  issues: CodeReviewIssue[];
  suggestions: string[];
  revisionNumber: number;
}

export interface TestExecutionResult {
  executionId?: string;
  framework?: string;
  command?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  executedAt?: string;
}

export interface FailureAnalysisResult {
  failureType?: string;
  summary?: string;
  probableCause?: string;
  affectedFiles?: string[];
  suggestedChanges?: string[];
  canRetryAutomatically?: boolean;
  requiresUserIntervention?: boolean;
}

export interface AutomationPlan {
  testName?: string;
  objective?: string;
  framework?: AutomationFramework;
  language?: AutomationLanguage;
  preconditions?: string[];
  requiredData?: string[];
  existingComponentsToReuse?: string[];
  existingClassesToUse?: string[];
  existingMethodsToUse?: string[];
  filesToCreate?: string[];
  filesToUpdate?: string[];
  assertions?: string[];
  risks?: string[];
  pendingItems?: string[];
  missingElements?: string[];
  requiresNewPageObject?: boolean;
  requiresUserIntervention?: boolean;
  blocked?: boolean;
  blockedReason?: string;
}

export interface AutoQaResponse {
  executionId: string;
  title?: string;
  status: AutoQaStatus;
  statusDescricao?: string;
  framework?: AutomationFramework;
  language?: AutomationLanguage;
  mode?: AutoQaMode;
  scenarioId?: string;
  scenarioText?: string;
  allowFileUpdate?: boolean;
  executeAfterGeneration?: boolean;
  projectPath?: string;
  discoveryResult?: ProjectDiscoveryResult;
  projectAnalysis?: ProjectAnalysisResult;
  automationPlan?: AutomationPlan;
  generatedFiles?: GeneratedFileMetadata[];
  codeReviewResult?: CodeReviewResult;
  executionResult?: TestExecutionResult;
  failureAnalysisResult?: FailureAnalysisResult;
  issues?: WorkflowIssue[];
  startedAt?: string;
  finishedAt?: string;
  message?: string;
}

export interface GeneratedFileMetadata {
  relativePath: string;
  operation?: GeneratedFileOperation;
  generatedHash?: string;
  hash?: string;
  storedRelativePath?: string;
  size?: number;
}

export interface ManifestResponse {
  executionId?: string;
  timestamp?: string;
  files: GeneratedFileMetadata[];
  [key: string]: unknown;
}

export interface FileToApply {
  relativePath: string;
  operation: GeneratedFileOperation;
  content: string;
  originalHash?: string | null;
  generatedHash?: string | null;
}

export interface FileApplicationResponse {
  success: boolean;
  backupId: string | null;
  appliedCount: number;
  message: string;
}

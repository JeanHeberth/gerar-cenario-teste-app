import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../enviroment/enviroment.prd';
import {
  AutoQaRequest,
  AutoQaResponse,
  FileApplicationResponse,
  FileToApply,
  GeneratedFileMetadata,
  ManifestResponse,
  ProjectFolderSelectionResponse,
  ProjectValidationResponse,
} from '../models/autoqa.interface';

@Injectable({ providedIn: 'root' })
export class AutoQaService {
  private readonly baseUrl = `${environment.apiUrl}/api/auto-qa`;

  constructor(private http: HttpClient) {}

  validateProjectPath(projectPath: string): Observable<ProjectValidationResponse> {
    return this.http.post<ProjectValidationResponse>(`${this.baseUrl}/project/validate`, { projectPath });
  }

  selectProjectFolder(): Observable<ProjectFolderSelectionResponse> {
    return this.http.post<ProjectFolderSelectionResponse>(`${this.baseUrl}/project/select-folder`, {});
  }

  analyze(request: AutoQaRequest): Observable<AutoQaResponse> {
    return this.http.post<AutoQaResponse>(`${this.baseUrl}/analyze`, request);
  }

  getExecution(executionId: string): Observable<AutoQaResponse> {
    return this.http.get<AutoQaResponse>(`${this.baseUrl}/executions/${executionId}`);
  }

  applyFiles(executionId: string, files: FileToApply[]): Observable<FileApplicationResponse> {
    return this.http.post<FileApplicationResponse>(`${this.baseUrl}/executions/${executionId}/apply`, { files });
  }

  generate(executionId: string): Observable<AutoQaResponse> {
    return this.http.post<AutoQaResponse>(`${this.baseUrl}/executions/${executionId}/generate`, {});
  }

  execute(executionId: string): Observable<AutoQaResponse> {
    return this.http.post<AutoQaResponse>(`${this.baseUrl}/executions/${executionId}/execute`, {});
  }

  discard(executionId: string): Observable<AutoQaResponse> {
    return this.http.post<AutoQaResponse>(`${this.baseUrl}/executions/${executionId}/discard`, {});
  }

  getManifest(executionId: string): Observable<ManifestResponse> {
    return this.http.get<ManifestResponse>(`${this.baseUrl}/executions/${executionId}/manifest`);
  }

  getGeneratedFiles(executionId: string): Observable<GeneratedFileMetadata[]> {
    return this.http.get<GeneratedFileMetadata[]>(`${this.baseUrl}/executions/${executionId}/generated-files`);
  }

  getFileContent(executionId: string, relativePath: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/executions/${executionId}/generated-files/content`,
      {
        params: { relativePath },
        responseType: 'text',
      }
    );
  }

  downloadFileUrl(executionId: string, path: string) {
    const encodedPath = path
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
    return `${this.baseUrl}/executions/${executionId}/files/${encodedPath}`;
  }

  downloadZipUrl(executionId: string) {
    return `${this.baseUrl}/executions/${executionId}/download`;
  }
}

import {Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {environment} from '../enviroment/enviroment.prd';
import {firstValueFrom} from 'rxjs';

interface JiraAttachmentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
}

interface JiraIssueAttachmentsResponse {
  taskKey: string;
  attachments: JiraAttachmentResponse[];
}

@Component({
  selector: 'app-cenario',
  imports: [
    ReactiveFormsModule,
    NgIf,
    NgForOf
  ],
  templateUrl: './cenario.component.html',
  standalone: true,
  styleUrl: './cenario.component.css'
})
export class CenarioComponent {
  form;
  successMessage = '';
  loading = false;
  jiraLoading = false;
  jiraMessage = '';
  jiraMessageType: 'success' | 'error' | 'info' | '' = '';

  arquivosPdfSelecionados: File[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      regraDeNegocio: ['', Validators.required],
      jiraTaskKey: ['']
    });
  }

  async buscarArquivosDaTaskJira(): Promise<void> {
    const taskKey = (this.form.get('jiraTaskKey')?.value || '').trim().toUpperCase();

    if (!taskKey) {
      this.jiraMessage = 'Informe a task Jira no formato ABC-123.';
      this.jiraMessageType = 'info';
      return;
    }

    this.jiraLoading = true;
    this.jiraMessage = '';
    this.jiraMessageType = '';

    try {
      const issue = await firstValueFrom(
        this.http.get<JiraIssueAttachmentsResponse>(`${environment.apiUrl}/jira/tasks/${taskKey}/attachments`)
      );

      const anexos = issue?.attachments || [];
      if (anexos.length === 0) {
        this.jiraMessage = `A task ${taskKey} nao possui anexos.`;
        this.jiraMessageType = 'info';
        return;
      }

      const anexosPdf = anexos.filter((anexo) =>
        anexo.mimeType === 'application/pdf' || anexo.fileName.toLowerCase().endsWith('.pdf')
      );

      if (anexosPdf.length === 0) {
        this.jiraMessage = `A task ${taskKey} nao possui anexos PDF.`;
        this.jiraMessageType = 'info';
        return;
      }

      const arquivosBaixados = await Promise.all(
        anexosPdf.map(async (anexo) => {
          const blob = await firstValueFrom(
            this.http.get(this.toAbsoluteApiUrl(anexo.downloadUrl), {responseType: 'blob'})
          );

          return new File([blob], anexo.fileName, {
            type: blob.type || anexo.mimeType || 'application/pdf'
          });
        })
      );

      const quantidadeAntes = this.arquivosPdfSelecionados.length;
      this.arquivosPdfSelecionados = this.removerDuplicados([
        ...this.arquivosPdfSelecionados,
        ...arquivosBaixados
      ]);

      const adicionados = this.arquivosPdfSelecionados.length - quantidadeAntes;
      this.jiraMessage = adicionados > 0
        ? `✅ ${adicionados} PDF(s) importado(s) da task ${taskKey}.`
        : `ℹ️ Os PDFs da task ${taskKey} ja estavam selecionados.`;
      this.jiraMessageType = adicionados > 0 ? 'success' : 'info';
    } catch (err) {
      console.error('Erro ao buscar anexos da task Jira:', err);
      this.jiraMessage = '❌ Nao foi possivel buscar anexos da task Jira. Verifique a task e tente novamente.';
      this.jiraMessageType = 'error';
    } finally {
      this.jiraLoading = false;
    }
  }

  selecionarPdf(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const novosArquivos = Array.from(input.files);

    const apenasPdfs = novosArquivos.filter((arquivo) =>
      arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')
    );

    if (apenasPdfs.length !== novosArquivos.length) {
      alert('Alguns arquivos foram ignorados. Apenas PDFs são permitidos.');
    }

    const arquivosCombinados = [
      ...this.arquivosPdfSelecionados,
      ...apenasPdfs
    ];

    this.arquivosPdfSelecionados = this.removerDuplicados(arquivosCombinados);

    input.value = '';
  }

  private removerDuplicados(arquivos: File[]): File[] {
    const mapa = new Map<string, File>();

    arquivos.forEach((arquivo) => {
      const chave = `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`;
      mapa.set(chave, arquivo);
    });

    return Array.from(mapa.values());
  }

  limparPdfs(): void {
    this.arquivosPdfSelecionados = [];
  }

  private toAbsoluteApiUrl(downloadUrl: string): string {
    if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
      return downloadUrl;
    }

    return `${environment.apiUrl}${downloadUrl}`;
  }

  gerar(): void {
    if (!this.form.valid) return;

    this.loading = true;

    const titulo = this.form.get('titulo')?.value || '';
    const regraDeNegocio = this.form.get('regraDeNegocio')?.value || '';

    if (this.arquivosPdfSelecionados.length > 0) {
      const formData = new FormData();

      formData.append('titulo', titulo);
      formData.append('regraDeNegocio', regraDeNegocio);

      this.arquivosPdfSelecionados.forEach((arquivo) => {
        formData.append('arquivos', arquivo);
      });

      this.http.post(`${environment.apiUrl}/cenario/com-pdf`, formData)
        .subscribe({
          next: () => this.sucesso(),
          error: (err) => this.erro(err)
        });

      return;
    }

    this.http.post(`${environment.apiUrl}/cenario`, {
      titulo,
      regraDeNegocio
    }).subscribe({
      next: () => this.sucesso(),
      error: (err) => this.erro(err)
    });
  }

  private sucesso(): void {
    this.successMessage = '✅ Cenário gerado com sucesso!';
    this.form.reset();
    this.arquivosPdfSelecionados = [];
    this.loading = false;

    setTimeout(() => this.successMessage = '', 4000);
  }

  private erro(err: any): void {
    console.error('Erro ao gerar cenário:', err);
    this.loading = false;
    alert('❌ Erro ao gerar cenário.');
  }

  irParaCenarios(): void {
    this.router.navigate(['/cenarios']);
  }
}

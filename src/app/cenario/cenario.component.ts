import {Component, OnInit} from '@angular/core';
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

interface AgentInfoResponse {
  id: string;
  fileName: string;
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
export class CenarioComponent implements OnInit {
  form;
  submitted = false;
  dragOver = false;
  successMessage = '';
  loading = false;
  jiraLoading = false;
  jiraDownloadLoading = false;
  jiraMessage = '';
  jiraMessageType: 'success' | 'error' | 'info' | '' = '';

  agents: AgentInfoResponse[] = [];
  agentsLoading = false;
  agentsMessage = '';
  uploadMessage = '';
  uploadMessageType: 'success' | 'error' | 'info' | '' = '';

  arquivosPdfSelecionados: File[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      regraDeNegocio: ['', Validators.required],
      jiraTaskKey: [''],
      agent: ['']
    });
  }

  ngOnInit(): void {
    this.carregarAgentes();
  }

  async carregarAgentes(): Promise<void> {
    this.agentsLoading = true;
    this.agentsMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.get<AgentInfoResponse[]>(`${environment.apiUrl}/api/agents`)
      );
      this.agents = response || [];

      if (this.agents.length === 0) {
        this.agentsMessage = 'Nenhum agente disponivel no backend.';
      }
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
      this.agentsMessage = 'Nao foi possivel carregar os agentes.';
      this.agents = [];
    } finally {
      this.agentsLoading = false;
    }
  }

  async buscarArquivosDaTaskJira(): Promise<void> {
    const taskKey = this.getTaskKey();

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

  async baixarTodosAnexosDaTaskJira(): Promise<void> {
    const taskKey = this.getTaskKey();

    if (!taskKey) {
      this.jiraMessage = 'Informe a task Jira no formato ABC-123.';
      this.jiraMessageType = 'info';
      return;
    }

    this.jiraDownloadLoading = true;
    this.jiraMessage = '';
    this.jiraMessageType = '';

    try {
      const response = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/jira/tasks/${taskKey}/attachments/download-all`, {
          observe: 'response',
          responseType: 'blob'
        })
      );

      const arquivo = this.extrairNomeArquivoZip(response.headers.get('content-disposition'), taskKey);
      const blob = response.body || new Blob([], {type: 'application/zip'});

      this.dispararDownload(blob, arquivo);
      this.jiraMessage = `✅ Download concluido: ${arquivo}`;
      this.jiraMessageType = 'success';
    } catch (err) {
      console.error('Erro ao baixar anexos da task Jira:', err);
      this.jiraMessage = `❌ Nao foi possivel baixar os anexos da task ${taskKey}.`;
      this.jiraMessageType = 'error';
    } finally {
      this.jiraDownloadLoading = false;
    }
  }

  selecionarPdf(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    this.adicionarArquivos(Array.from(input.files));

    input.value = '';
  }

  aoArrastarSobre(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  aoSairArrasto(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  aoSoltarArquivos(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    const arquivos = Array.from(event.dataTransfer?.files || []);
    if (arquivos.length === 0) {
      return;
    }

    this.adicionarArquivos(arquivos);
  }

  private adicionarArquivos(novosArquivos: File[]): void {
    this.uploadMessage = '';
    this.uploadMessageType = '';

    const apenasPdfs = novosArquivos.filter((arquivo) =>
      arquivo.type === 'application/pdf' || arquivo.name.toLowerCase().endsWith('.pdf')
    );

    if (apenasPdfs.length === 0) {
      this.uploadMessage = 'Nenhum PDF valido foi selecionado.';
      this.uploadMessageType = 'error';
      return;
    }

    const arquivosCombinados = [
      ...this.arquivosPdfSelecionados,
      ...apenasPdfs
    ];

    const quantidadeAntes = this.arquivosPdfSelecionados.length;
    this.arquivosPdfSelecionados = this.removerDuplicados(arquivosCombinados);
    const adicionados = this.arquivosPdfSelecionados.length - quantidadeAntes;

    if (apenasPdfs.length !== novosArquivos.length) {
      this.uploadMessage = 'Alguns arquivos foram ignorados. Apenas PDFs sao permitidos.';
      this.uploadMessageType = 'info';
      return;
    }

    if (adicionados > 0) {
      this.uploadMessage = `${adicionados} PDF(s) adicionado(s) com sucesso.`;
      this.uploadMessageType = 'success';
      return;
    }

    this.uploadMessage = 'Os PDFs selecionados ja estavam na lista.';
    this.uploadMessageType = 'info';
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
    this.uploadMessage = '';
    this.uploadMessageType = '';
  }

  removerPdf(index: number): void {
    this.arquivosPdfSelecionados.splice(index, 1);
    this.arquivosPdfSelecionados = [...this.arquivosPdfSelecionados];
  }

  campoInvalido(nomeCampo: string): boolean {
    const campo = this.form.get(nomeCampo);
    return !!campo && campo.invalid && (campo.touched || this.submitted);
  }

  private getTaskKey(): string {
    return (this.form.get('jiraTaskKey')?.value || '').trim().toUpperCase();
  }

  private getAgent(): string {
    return (this.form.get('agent')?.value || '').trim();
  }

  private toAbsoluteApiUrl(downloadUrl: string): string {
    if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
      return downloadUrl;
    }

    return `${environment.apiUrl}${downloadUrl}`;
  }

  private extrairNomeArquivoZip(contentDisposition: string | null, taskKey: string): string {
    if (!contentDisposition) {
      return `${taskKey}.zip`;
    }

    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match?.[1] || `${taskKey}.zip`;
  }

  private dispararDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  gerar(): void {
    this.submitted = true;

    if (!this.form.valid) return;

    this.loading = true;

    const titulo = this.form.get('titulo')?.value || '';
    const regraDeNegocio = this.form.get('regraDeNegocio')?.value || '';
    const agent = this.getAgent();

    if (this.arquivosPdfSelecionados.length > 0) {
      const formData = new FormData();

      formData.append('titulo', titulo);
      formData.append('regraDeNegocio', regraDeNegocio);

      if (agent) {
        formData.append('agent', agent);
      }

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
      regraDeNegocio,
      agent
    }).subscribe({
      next: () => this.sucesso(),
      error: (err) => this.erro(err)
    });
  }

  private sucesso(): void {
    this.successMessage = '✅ Cenario gerado com sucesso!';
    this.form.reset({agent: ''});
    this.arquivosPdfSelecionados = [];
    this.submitted = false;
    this.loading = false;

    setTimeout(() => this.successMessage = '', 4000);
  }

  private erro(err: any): void {
    console.error('Erro ao gerar cenario:', err);
    this.loading = false;
    alert('❌ Erro ao gerar cenario.');
  }

  irParaCenarios(): void {
    this.router.navigate(['/cenarios']);
  }
}

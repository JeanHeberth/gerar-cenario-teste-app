import {Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {environment} from '../enviroment/enviroment.prd';

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

  arquivosPdfSelecionados: File[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      regraDeNegocio: ['', Validators.required]
    });
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

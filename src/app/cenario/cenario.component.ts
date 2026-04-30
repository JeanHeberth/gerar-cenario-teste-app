import {Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {environment} from '../enviroment/enviroment.prd';

@Component({
  selector: 'app-cenario',
  imports: [
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './cenario.component.html',
  standalone: true,
  styleUrl: './cenario.component.css'
})
export class CenarioComponent {

  form;
  successMessage = '';
  loading = false;

  // 📎 NOVO
  arquivoPdfSelecionado: File | null = null;

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

  // 📎 NOVO
  selecionarPdf(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.arquivoPdfSelecionado = null;
      return;
    }

    const arquivo = input.files[0];

    if (arquivo.type !== 'application/pdf') {
      alert('Selecione apenas arquivos PDF.');
      input.value = '';
      this.arquivoPdfSelecionado = null;
      return;
    }

    this.arquivoPdfSelecionado = arquivo;
  }

  gerar() {
    if (!this.form.valid) return;

    this.loading = true;

    const titulo = this.form.get('titulo')?.value || '';
    const regraDeNegocio = this.form.get('regraDeNegocio')?.value || '';

    if (this.arquivoPdfSelecionado) {
      const formData = new FormData();

      formData.append('titulo', titulo);
      formData.append('regraDeNegocio', regraDeNegocio);
      formData.append('arquivo', this.arquivoPdfSelecionado);

      this.http.post(`${environment.apiUrl}/cenario/com-pdf`, formData)
        .subscribe({
          next: () => this.sucesso(),
          error: (err) => this.erro(err)
        });

      return;
    }

    this.http.post(`${environment.apiUrl}/cenario`, {titulo, regraDeNegocio})
      .subscribe({
        next: () => this.sucesso(),
        error: (err) => this.erro(err)
      });
  }

  private sucesso() {
    this.successMessage = '✅ Cenário gerado com sucesso!';
    this.form.reset();
    this.arquivoPdfSelecionado = null;
    this.loading = false;

    setTimeout(() => this.successMessage = '', 4000);
  }

  private erro(err: any) {
    console.error('Erro ao gerar cenário:', err);
    this.loading = false;
    alert('❌ Erro ao gerar cenário');
  }

  irParaCenarios() {
    this.router.navigate(['/cenarios']);
  }
}

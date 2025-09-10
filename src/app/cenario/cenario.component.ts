import {Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {Router} from '@angular/router';

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
  mostrarChat = false;


  loading = false;
  cenarioGerado: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      regraDeNegocio: ['', Validators.required]
    });
  }

  gerar() {
    if (this.form.valid) {
      this.loading = true;
      const data = this.form.value;

      this.http.post('http://192.168.0.144:8089/cenario', data).subscribe({
        next: () => {
          this.successMessage = '✅ Cenário gerado com sucesso!';
          this.form.reset();
          this.loading = false;

          setTimeout(() => this.successMessage = '', 4000); // some após 4s
        },
        error: (err) => {
          console.error('Erro ao gerar cenário:', err);
          this.loading = false;
        }
      });
    }
  }

  irParaCenarios() {
    this.router.navigate(['/cenarios']);
  }



}

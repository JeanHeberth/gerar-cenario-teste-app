import {Component} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {NgForOf, NgIf} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-cenario',
  imports: [
    ReactiveFormsModule,
  ],
  templateUrl: './cenario.component.html',
  styleUrl: './cenario.component.css'
})
export class CenarioComponent {
  form;

  loading = false;
  cenarioGerado: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      regra: ['', Validators.required]
    });
  }

  gerar() {
    if (this.form.invalid) return;
    this.loading = true;
    this.cenarioGerado = null;

    const {titulo, regra} = this.form.value;

    this.http.post<any>('http://192.168.1.10:8088/cenario', {titulo, regraDeNegocio: regra}).subscribe({
      next: res => {
        this.cenarioGerado = res.cenarioGerado;
        this.loading = false;
        this.form.reset(); // limpa os campos após gerar o cenário
      },
      error: err => {
        this.loading = false;
        this.cenarioGerado = 'Erro ao gerar cenário';
        console.error(err);
      }
    });
  }

  irParaCenariosAntigos() {
    this.router.navigate(['/cenarios']);
  }
}

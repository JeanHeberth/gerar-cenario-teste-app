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
    });
  }

  gerar() {
    this.loading = true;

        this.loading = false;
      },
        this.loading = false;
      }
    });
  }

    this.router.navigate(['/cenarios']);
  }
}

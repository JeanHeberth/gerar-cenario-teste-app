import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];


  ngOnInit(): void {
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  exportar(cenario: any, formato: string) {


    }

      const conteudo = `
      <h1>${cenario.titulo}</h1>
    `;

      const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
    }
  }
}

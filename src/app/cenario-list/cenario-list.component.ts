import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';


@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.1.10:8088/cenario').subscribe({
      next: (res) => this.cenarios = res,
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  exportar(cenario: any, formato: string) {
    if (formato === 'xlsx') {
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
        ['Título', cenario.titulo],
        ['Regra de Negócio', cenario.regraDeNegocio],
        ['Cenário', cenario.cenarioGerado]
      ]);

      const wb: XLSX.WorkBook = {
        Sheets: { 'Cenário de Teste': ws },
        SheetNames: ['Cenário de Teste']
      };

      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      FileSaver.saveAs(blob, `${cenario.titulo}.xlsx`);
    }

    // se quiser manter o .doc
    if (formato === 'doc') {
      const conteudo = `
      <h1>${cenario.titulo}</h1>
      <p><strong>Regra de Negócio:</strong> ${cenario.regraDeNegocio}</p>
      <pre>${cenario.cenarioGerado}</pre>
    `;

      const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
      FileSaver.saveAs(blob, `${cenario.titulo}.doc`);
    }
  }
}

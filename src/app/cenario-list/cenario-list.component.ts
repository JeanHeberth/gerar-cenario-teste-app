import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';

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
    this.http.get<any[]>('http://192.168.1.99:8089/cenario').subscribe({
      next: (res) => this.cenarios = res.reverse(),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  exportar(cenario: any, formato: string) {
    switch (formato) {
      case 'xlsx':
        this.exportarParaExcel(cenario);
        break;
      case 'doc':
        this.exportarParaDoc(cenario);
        break;
      case 'pdf':
        this.exportarParaPDF(cenario);
        break;
      default:
        console.warn(`Formato não suportado: ${formato}`);
    }
  }

  // 📊 Exportar cada cenário individual como linha no Excel
  private exportarParaExcel(cenario: any): void {
    const titulo = cenario.titulo;
    const regra = cenario.regraDeNegocio;
    const criterios = cenario.criteriosAceitacao;

    const dados = cenario.cenarios.map((c: string) => ({
      Título: titulo,
      'Regra de Negócio': regra,
      'Critérios de Aceitação': criterios,
      Cenário: c
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dados);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenarios');

    const buffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `${titulo.replace(/\s+/g, '_')}_cenarios.xlsx`);
  }


  // 📄 Exportar para Word (.doc)
  private exportarParaDoc(cenario: any): void {
    const blocosCenarios = cenario.cenarios.map((c: string) => `<pre>${c}</pre>`).join('<br><br>');

    const conteudo = `
    <h1>${cenario.titulo}</h1>
    <p><strong>Regra de Negócio:</strong> ${cenario.regraDeNegocio}</p>
    <h3>Critérios de Aceitação:</h3>
    <pre>${cenario.criteriosAceitacao}</pre>
    <h3>Cenários de Teste:</h3>
    ${blocosCenarios}
  `;

    const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
    FileSaver.saveAs(blob, `${cenario.titulo.replace(/\s+/g, '_')}.doc`);
  }


  // 🧾 Exportar para PDF (.pdf)
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;
    let altura = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(cenario.titulo, margem, altura);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    altura += 10;

    doc.text('Regra de Negócio:', margem, altura);
    altura += 8;
    const regra = doc.splitTextToSize(cenario.regraDeNegocio, 180);
    doc.text(regra, margem, altura);

    altura += regra.length * 7 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Critérios de Aceitação:', margem, altura);
    altura += 8;

    const criterios = doc.splitTextToSize(cenario.criteriosAceitacao, 180);
    doc.setFont('helvetica', 'normal');
    doc.text(criterios, margem, altura);

    altura += criterios.length * 7 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Cenários:', margem, altura);
    altura += 8;

    doc.setFont('helvetica', 'normal');
    for (const bloco of cenario.cenarios) {
      const linhas = doc.splitTextToSize(bloco, 180);
      if (altura + linhas.length * 7 > 280) {
        doc.addPage();
        altura = 20;
      }
      doc.text(linhas, margem, altura);
      altura += linhas.length * 7 + 10;
    }

    doc.save(`${cenario.titulo.replace(/\s+/g, '_')}.pdf`);
  }
}

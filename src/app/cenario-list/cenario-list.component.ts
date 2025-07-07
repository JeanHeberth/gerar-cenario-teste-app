import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.http.get<any[]>('http://192.168.0.198:8089/cenario').subscribe({
      next: (res) => this.cenarios = res.reverse(),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  getJiraUrl(cenario: any): string {
    const summary = encodeURIComponent(cenario.titulo);
    const description = encodeURIComponent(
      `Regra de Negócio: ${cenario.regraDeNegocio}\n\nCritérios:\n${cenario.criteriosAceitacao}\n\nCenários:\n${cenario.cenarios.join('\n')}`
    );
    return `https://SEU_DOMINIO_JIRA/secure/CreateIssueDetails!init.jspa?pid=10000&issuetype=10001&summary=${summary}&description=${description}`;
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

    const dados = cenario.cenarios.map((c: string) => ({
      Título: titulo,
      'Regra de Negócio': regra,
      Cenário: c
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dados);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenarios');

    const buffer: any = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
    const blob = new Blob([buffer], {type: 'application/octet-stream'});
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

    const blob = new Blob(['\ufeff' + conteudo], {type: 'application/msword'});
    FileSaver.saveAs(blob, `${cenario.titulo.replace(/\s+/g, '_')}.doc`);
  }


  // 🧾 Exportar para PDF (.pdf)
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;
    let altura = 20;

    // Cenários
    doc.setFont('helvetica', 'bold');
    doc.setFont('helvetica', 'normal');
    for (const bloco of cenario.cenarios) {
      const linhas = doc.splitTextToSize(bloco, 180);

      // Quebra de página, se necessário
      if (altura + linhas.length * 7 > 280) {
        doc.addPage();
        altura = 20;
      }

      doc.text(linhas, margem, altura);
      altura += linhas.length * 7 + 10;
    }

    // Nome do arquivo limpo
    const nomeArquivo = cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    doc.save(`${nomeArquivo}.pdf`);
  }

}

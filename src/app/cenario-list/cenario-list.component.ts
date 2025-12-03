import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import { DOC_EXPORT_STYLES } from './doc-export.styles';
import { environment } from '../enviroment/enviroment.prd';

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];
  jiraDomain: string = 'https://jeanheberth19.atlassian.net';
  jiraProjectId: string = '';
  jiraTestCaseIssueTypeId: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/cenario`).subscribe({
      next: (res) => (this.cenarios = res.reverse()),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  irParaCriacao(): void {
    this.router.navigate(['/']);
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

  // 📊 Exportar para Excel com formatação aprimorada (xlsx-js-style)
  private exportarParaExcel(cenario: any): void {
    const cabecalho = [
      'Nome',
      'Objetivo',
      'Precondição',
      'Script de Teste (Passo a Passo)',
      'Resultado Esperado',
      'Componente',
      'Rótulos',
      'Propósito',
      'Pasta',
      'Proprietário',
      'Cobertura (Issues)',
      'Status'
    ];

    const linhas: any[][] = [cabecalho];
    const tituloCenario = cenario.titulo || '';

    // Divide os blocos por "---"
    const blocos = (cenario.cenarios?.[0] || '')
      .split(/\n---\n/)
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    blocos.forEach((bloco: string) => {
      const nome = (bloco.match(/Nome:\s*(.*)/i)?.[1] || '').trim();
      const objetivo = (bloco.match(/Objetivo:\s*([\s\S]*?)(?=\nPrecondição:|$)/i)?.[1] || '').trim();
      const precondicao = (bloco.match(/Precondição:\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\):|$)/i)?.[1] || '').trim();

      // Passo a passo — formata com quebras de linha
      let passoAPasso = (
        bloco.match(/Script de Teste \(Passo-a-Passo\):\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\) - Resultado:|$)/i)?.[1] || ''
      ).trim();
      passoAPasso = passoAPasso
        .replace(/(?<=,|\.)\s*(E|Quando)\b/g, '\n$1')
        .replace(/(Dado que)/, '$1');

      // Resultado esperado — formata com quebras de linha
      let resultadoEsperado = (
        bloco.match(/Script de Teste \(Passo-a-Passo\) - Resultado:\s*([\s\S]*?)(?=\nComponente:|Rótulos:|Propósito:|Pasta:|Proprietário:|Cobertura:|Status:|$)/i)?.[1] || ''
      ).trim();
      resultadoEsperado = resultadoEsperado
        .replace(/(?<=,|\.)\s*(E( não| o sistema)?|Então)\b/gi, '\n$1')
        .replace(/(Então)/, '$1');

      const componente = (bloco.match(/Componente:\s*(.*)/i)?.[1] || '').trim();
      const rotulos = (bloco.match(/Rótulos:\s*(.*)/i)?.[1] || '').trim();
      const proposito = "TESTE MANUAL";
      const pasta = (bloco.match(/Pasta:\s*(.*)/i)?.[1] || '').trim();
      const proprietario = "JIRAUSER23105";
      const cobertura = (bloco.match(/Cobertura:\s*(.*)/i)?.[1] || '').trim();
      const status = "APPROVED";

      linhas.push([
        nome,
        objetivo,
        precondicao,
        passoAPasso,
        resultadoEsperado,
        componente,
        rotulos,
        proposito,
        pasta,
        proprietario,
        cobertura,
        status
      ]);
    });

    // Cria planilha com estilo (xlsx-js-style)
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(linhas);

    // Aplica estilo
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = {
          font: { name: 'Calibri', sz: 14 },
          alignment: { vertical: 'top', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '999999' } },
            bottom: { style: 'thin', color: { rgb: '999999' } },
            left: { style: 'thin', color: { rgb: '999999' } },
            right: { style: 'thin', color: { rgb: '999999' } }
          },
          fill: R === 0 ? { fgColor: { rgb: 'D9D9D9' } } : undefined
        };
      }
    }

    ws['!cols'] = [
      { wch: 40 }, { wch: 45 }, { wch: 40 },
      { wch: 70 }, { wch: 70 },
      { wch: 35 }, { wch: 30 }, { wch: 35 },
      { wch: 45 }, { wch: 30 }, { wch: 25 }, { wch: 25 }
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenários');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const nomeArquivo = tituloCenario.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    FileSaver.saveAs(blob, `${nomeArquivo}_ZephyrScale.xlsx`);
  }

  // 🧾 Exportar para PDF (mantém igual)
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;
    const larguraMax = doc.internal.pageSize.getWidth() - 2 * margem;
    let y = 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(cenario.titulo, margem, y);
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(cenario.regraDeNegocio || '', larguraMax), margem, y);
    doc.save(`${cenario.titulo}_ZephyrScale.pdf`);
  }

  // 📄 Exportar para Word (.doc)
  private exportarParaDoc(cenario: any): void {
    const conteudo = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><style>${DOC_EXPORT_STYLES}</style></head>
      <body><h1>${cenario.titulo}</h1><h2>Regra de Negócio</h2><p>${cenario.regraDeNegocio}</p></body>
      </html>`;
    const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
    FileSaver.saveAs(blob, `${cenario.titulo}_ZephyrScale.doc`);
  }
}

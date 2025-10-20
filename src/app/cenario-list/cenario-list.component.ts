import {DOC_EXPORT_STYLES} from './doc-export.styles';
import {environment} from '../enviroment/enviroment.prd'; // Importa os estilos
import {FormsModule} from '@angular/forms'; // Importe o FormsModule

import {Router, RouterModule} from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import {HttpClient} from '@angular/common/http';
import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];

  constructor(private http: HttpClient, private router: Router) {
  }

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/cenario`).subscribe({
      next: (res) => this.cenarios = res.reverse(),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  irParaCriacao(): void {
    this.router.navigate(['/']);
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
  // 📊 Exportar para Excel com prevenção de duplicidade
   private async exportarParaExcel(cenario: any): Promise<void> {
    // Import dinâmico — só carrega no navegador
    const XLSX = await import('xlsx-js-style');
    const cabecalho = [
      'Nome',
      'Objetivo',
      'Precondição',
      'Passo-a-Passo',
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

    // Divide o JSON em blocos individuais de cenário
    const blocos = (cenario.cenarios?.[0] || '')
      .split(/\n---\n/)
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    blocos.forEach((bloco: string) => {
      const nome = (bloco.match(/Nome:\s*(.*)/i)?.[1] || '').trim();
      const objetivo = (bloco.match(/Objetivo:\s*([\s\S]*?)(?=\nPrecondição:|$)/i)?.[1] || '').trim();
      const precondicao = (bloco.match(/Precondição:\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\):|$)/i)?.[1] || '').trim();

      // 🔹 Passo-a-passo formatado com ícone e quebra de linha
      let passoAPasso = (
        bloco.match(/Script de Teste \(Passo-a-Passo\):\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\) - Resultado:|$)/i)?.[1] || ''
      ).trim()
        .replace(/Dado que/g, '💡 Dado que')
        .replace(/\s+(E|Quando)\s+/g, '\n$1 ')
        .replace(/,\s*Quando/g, ',\nQuando');

      // 🔹 Resultado esperado formatado
      let resultadoEsperado = (
        bloco.match(/Script de Teste \(Passo-a-Passo\) - Resultado:\s*([\s\S]*?)(?=\nComponente:|Rótulos:|Propósito:|Pasta:|Proprietário:|Cobertura:|Status:|$)/i)?.[1] || ''
      ).trim()
        .replace(/Então/g, '✅ Então')
        .replace(/\s+(E|E não|E o sistema|E o novo|E não executa)/gi, '\n$1 ')
        .replace(/,\s*E/g, ',\nE');

      const componente = (bloco.match(/Componente:\s*(.*)/i)?.[1] || '').trim();
      const rotulos = (bloco.match(/Rótulos:\s*(.*)/i)?.[1] || '').trim();
      const proposito = (bloco.match(/Propósito:\s*([\s\S]*?)(?=\nPasta:|$)/i)?.[1] || '').trim();
      const pasta = (bloco.match(/Pasta:\s*(.*)/i)?.[1] || '').trim();
      const proprietario = (bloco.match(/Proprietário:\s*(.*)/i)?.[1] || '').trim();
      const cobertura = (bloco.match(/Cobertura:\s*(.*)/i)?.[1] || '').trim();
      const status = (bloco.match(/Status:\s*(.*)/i)?.[1] || '').trim();

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

    // Cria a planilha
    const ws: any = XLSX.utils.aoa_to_sheet(linhas);

    // 🎨 Estilos visuais
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };

    const headerStyle = {
      font: { bold: true, sz: 14, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'D9D9D9' } },
      border: borderStyle
    };

    const cellStyle = {
      font: { sz: 14 },
      alignment: { vertical: 'top', wrapText: true },
      border: borderStyle
    };

    // Aplica estilo a cada célula
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = R === 0 ? headerStyle : cellStyle;
      }
    }

    // Largura e altura automáticas
    ws['!cols'] = [
      { wch: 40 }, { wch: 45 }, { wch: 40 },
      { wch: 70 }, { wch: 70 },
      { wch: 35 }, { wch: 30 }, { wch: 35 },
      { wch: 45 }, { wch: 30 }, { wch: 25 }, { wch: 25 }
    ];

    ws['!rows'] = linhas.map((linha, i) => {
      const text = (linha[3] || linha[4] || '').toString();
      const breaks = (text.match(/\n/g) || []).length;
      return { hpt: 25 + breaks * 12 };
    });

    // 📘 Cria o workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenários');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const nomeArquivo = tituloCenario.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    FileSaver.saveAs(blob, `${nomeArquivo}_ZephyrScale.xlsx`);
=======

  // 📊 Exportar para Excel com prevenção de duplicidade
  private async exportarParaExcel(cenario: any): Promise<void> {
    // Import dinâmico — só carrega no navegador
    const XLSX = await import('xlsx-js-style');
    const cabecalho = [
      'Nome',
      'Objetivo',
      'Precondição',
      'Passo-a-Passo',
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

    // Divide o JSON em blocos individuais de cenário
    const blocos = (cenario.cenarios?.[0] || '')
      .split(/\n---\n/)
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    blocos.forEach((bloco: string) => {
      const nome = (bloco.match(/Nome:\s*(.*)/i)?.[1] || '').trim();
      const objetivo = (bloco.match(/Objetivo:\s*([\s\S]*?)(?=\nPrecondição:|$)/i)?.[1] || '').trim();
      const precondicao = (bloco.match(/Precondição:\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\):|$)/i)?.[1] || '').trim();

      // 🔹 Passo-a-passo formatado com ícone e quebra de linha
      let passoAPasso = (
        bloco.match(/Script de Teste \(Passo-a-Passo\):\s*([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\) - Resultado:|$)/i)?.[1] || ''
      ).trim()
        .replace(/Dado que/g, '💡 Dado que')
        .replace(/\s+(E|Quando)\s+/g, '\n$1 ')
        .replace(/,\s*Quando/g, ',\nQuando');

      // 🔹 Resultado esperado formatado
      let resultadoEsperado = (
        bloco.match(/Script de Teste \(Passo-a-Passo\) - Resultado:\s*([\s\S]*?)(?=\nComponente:|Rótulos:|Propósito:|Pasta:|Proprietário:|Cobertura:|Status:|$)/i)?.[1] || ''
      ).trim()
        .replace(/Então/g, '✅ Então')
        .replace(/\s+(E|E não|E o sistema|E o novo|E não executa)/gi, '\n$1 ')
        .replace(/,\s*E/g, ',\nE');

      const componente = (bloco.match(/Componente:\s*(.*)/i)?.[1] || '').trim();
      const rotulos = (bloco.match(/Rótulos:\s*(.*)/i)?.[1] || '').trim();
      const proposito = (bloco.match(/Propósito:\s*([\s\S]*?)(?=\nPasta:|$)/i)?.[1] || '').trim();
      const pasta = (bloco.match(/Pasta:\s*(.*)/i)?.[1] || '').trim();
      const proprietario = (bloco.match(/Proprietário:\s*(.*)/i)?.[1] || '').trim();
      const cobertura = (bloco.match(/Cobertura:\s*(.*)/i)?.[1] || '').trim();
      const status = (bloco.match(/Status:\s*(.*)/i)?.[1] || '').trim();

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

    // Cria a planilha
    const ws: any = XLSX.utils.aoa_to_sheet(linhas);

    // 🎨 Estilos visuais
    const borderStyle = {
      top: {style: 'thin', color: {rgb: '000000'}},
      bottom: {style: 'thin', color: {rgb: '000000'}},
      left: {style: 'thin', color: {rgb: '000000'}},
      right: {style: 'thin', color: {rgb: '000000'}}
    };

    const headerStyle = {
      font: {bold: true, sz: 14, color: {rgb: '000000'}},
      alignment: {horizontal: 'center', vertical: 'center', wrapText: true},
      fill: {fgColor: {rgb: 'D9D9D9'}},
      border: borderStyle
    };

    const cellStyle = {
      font: {sz: 14},
      alignment: {vertical: 'top', wrapText: true},
      border: borderStyle
    };

    // Aplica estilo a cada célula
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({r: R, c: C});
        if (!ws[cellRef]) continue;
        ws[cellRef].s = R === 0 ? headerStyle : cellStyle;
      }
    }

    // Largura e altura automáticas
    ws['!cols'] = [
      {wch: 40}, {wch: 45}, {wch: 40},
      {wch: 70}, {wch: 70},
      {wch: 35}, {wch: 30}, {wch: 35},
      {wch: 45}, {wch: 30}, {wch: 25}, {wch: 25}
    ];

    ws['!rows'] = linhas.map((linha, i) => {
      const text = (linha[3] || linha[4] || '').toString();
      const breaks = (text.match(/\n/g) || []).length;
      return {hpt: 25 + breaks * 12};
    });

    // 📘 Cria o workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenários');

    const buffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
    const blob = new Blob([buffer], {type: 'application/octet-stream'});
    const nomeArquivo = tituloCenario.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    FileSaver.saveAs(blob, `${nomeArquivo}_ZephyrScale.xlsx`);
  }


  // 📄 Exportar para Word (.doc)
  private exportarParaDoc(cenario: any): void {
    const blocosCenarios = cenario.cenarios.map((c: string) => `<pre>${c}</pre>`).join('<br><br>');

    const conteudo = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${DOC_EXPORT_STYLES}
          </style>
        </head>
        <body>
          <h1>${cenario.titulo}</h1>

          <h2>Regra de Negócio</h2>
          <p>${cenario.regraDeNegocio}</p>

          <h2>Critérios de Aceitação</h2>
          <pre>${criteriosHtml}</pre>

          <h2>Cenários de Teste</h2>
          ${blocosHtml}
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + conteudo], {type: 'application/msword'});
    FileSaver.saveAs(blob, `${cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')}.doc`);
  }


  // 🧾 Exportar para PDF (.pdf)
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;
    let altura = 20;

    // Cenários
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0);
    const tituloLinhas = doc.splitTextToSize(cenario.titulo, larguraMaxima);
    doc.text(tituloLinhas, doc.internal.pageSize.getWidth() / 2, altura, {align: 'center'});
    altura += tituloLinhas.length * 8 + 15;

    // Processamento de Critérios e Cenários
    const criteriosAdicionados = new Set<string>();
    const todosOsBlocos = [cenario.criteriosAceitacao, ...cenario.cenarios];

    for (const bloco of todosOsBlocos) {
      const linhasDoBloco = bloco.split('\n');
      for (const linha of linhasDoBloco) {
        let textoLimpo = linha.replace(/\*/g, '').trim();
        if (!textoLimpo || criteriosAdicionados.has(textoLimpo)) continue;

        criteriosAdicionados.add(textoLimpo);
        const isTitulo = textoLimpo.startsWith('####');

        if (isTitulo) {
          textoLimpo = textoLimpo.replace(/####/g, '').trim();
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(0);
          altura += 6; // Espaço antes do título de seção
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0);
        }

        const linhasParaRenderizar = doc.splitTextToSize(textoLimpo, larguraMaxima);
        for (const linhaParaRenderizar of linhasParaRenderizar) {
          if (altura + 8 > alturaMaximaPagina) {
            doc.addPage();
            pageNumber++;
            addHeader();
            addFooter(pageNumber);
            altura = 25;
          }
          doc.text(linhaParaRenderizar, margem, altura);
          altura += 8;
        }

        if (isTitulo) {
          altura += 2;
          doc.line(margem, altura - 1, margem + larguraMaxima, altura - 1);
          altura += 4;
        }

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

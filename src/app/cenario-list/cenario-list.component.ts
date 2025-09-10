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
    this.http.get<any[]>('http://192.168.0.144:8089/cenario').subscribe({
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
  // 📊 Exportar para Excel com prevenção de duplicidade
  private exportarParaExcel(cenario: any): void {
    const data: any[][] = [];
    const criteriosAdicionados = new Set<string>();

    // Adiciona Título e Regra de Negócio
    data.push(['Título', cenario.titulo]);
    data.push(['Regra de Negócio', cenario.regraDeNegocio]);
    data.push([]); // Linha em branco

    // Adiciona Critérios de Aceitação e os armazena para evitar duplicidade
    data.push(['Critérios de Aceitação']);
    cenario.criteriosAceitacao.split('\n').forEach((linha: string) => {
      const linhaLimpa = linha.replace(/\*/g, '').trim();
      if (linhaLimpa) {
        criteriosAdicionados.add(linhaLimpa);
        data.push(['', linhaLimpa]);
      }
    });
    data.push([]); // Linha em branco

    // Adiciona Cenários de Teste, pulando os que já foram adicionados como critérios
    data.push(['Cenários de Teste']);
    cenario.cenarios.forEach((bloco: string) => {
      const textoLimpo = bloco.replace(/\*/g, '').trim();
      if (textoLimpo && !criteriosAdicionados.has(textoLimpo)) {
        if (textoLimpo.startsWith('####')) {
          data.push([]); // Espaço antes do título
          data.push([textoLimpo.replace(/####/g, '').trim()]);
        } else {
          textoLimpo.split('\n').forEach((linha: string) => {
            if (linha.trim() && !criteriosAdicionados.has(linha.trim())) {
              data.push(['', linha.trim()]);
            }
          });
        }
      }
    });

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 100 }];
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cenário');

    const buffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const nomeArquivo = cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    FileSaver.saveAs(blob, `${nomeArquivo}.xlsx`);
  }


  // 📄 Exportar para Word (.doc) com Estilo Profissional para QE
  private exportarParaDoc(cenario: any): void {
    const criteriosAdicionados = new Set<string>();

    // Processa os Critérios de Aceitação, mantendo a formatação com <pre>
    const criteriosHtml = cenario.criteriosAceitacao.split('\n').map((linha: string) => {
      const linhaLimpa = linha.replace(/\*/g, '').trim();
      if (linhaLimpa) {
        criteriosAdicionados.add(linhaLimpa);
        return linhaLimpa;
      }
      return null;
    }).filter(Boolean).join('\n');

    // Processa os Cenários de Teste
    const blocosHtml = cenario.cenarios.map((bloco: string) => {
      let textoLimpo = bloco.replace(/\*/g, '').trim();
      if (!textoLimpo || criteriosAdicionados.has(textoLimpo)) {
        return ''; // Pula blocos vazios ou já adicionados
      }
      if (textoLimpo.startsWith('####')) {
        // Título de seção dentro dos cenários
        return `<h3>${textoLimpo.replace(/####/g, '').trim()}</h3>`;
      }
      // Cenário de teste, mantendo a formatação com <pre>
      return `<pre>${textoLimpo}</pre>`;
    }).join('');

    const conteudo = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Calibri, Arial, sans-serif;
              font-size: 12pt;
              color: #000000;
              line-height: 1.4;
            }
            h1 {
              font-size: 22pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 1.5em;
            }
            h2 {
              font-size: 16pt;
              font-weight: bold;
              border-bottom: 2px solid #000000;
              padding-bottom: 4px;
              margin-top: 1.5em;
              margin-bottom: 1em;
            }
            h3 {
              font-size: 14pt;
              font-weight: bold;
              border-bottom: 1px solid #cccccc;
              padding-bottom: 3px;
              margin-top: 1.5em;
              margin-bottom: 0.8em;
            }
            p {
              margin-bottom: 1em;
            }
            pre {
              white-space: pre-wrap;
              font-family: Calibri, Arial, sans-serif;
              font-size: 12pt;
              margin: 0;
              padding: 0;
            }
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

    const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
    FileSaver.saveAs(blob, `${cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')}.doc`);
  }


  // 🧾 Exportar para PDF (.pdf) com Estilo Padronizado
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;
    const larguraMaxima = doc.internal.pageSize.getWidth() - 2 * margem;
    const alturaMaximaPagina = doc.internal.pageSize.getHeight() - 2 * margem;

    const addHeader = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0); // Cor preta
      doc.text('Documento de Cenário de Teste', margem, 10);
      doc.line(margem, 12, larguraMaxima + margem, 12);
    };

    const addFooter = (pageNumber: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0); // Cor preta
      const texto = `Página ${pageNumber}`;
      const textoLargura = doc.getTextWidth(texto);
      doc.text(texto, doc.internal.pageSize.getWidth() - margem - textoLargura, doc.internal.pageSize.getHeight() - 10);
    };

    let pageNumber = 1;
    addHeader();
    addFooter(pageNumber);
    let altura = 25; // Posição inicial Y

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0);
    const tituloLinhas = doc.splitTextToSize(cenario.titulo, larguraMaxima);
    doc.text(tituloLinhas, doc.internal.pageSize.getWidth() / 2, altura, { align: 'center' });
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
      }
    }

    // Nome do arquivo
    const nomeArquivo = cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    doc.save(`${nomeArquivo}.pdf`);
  }
}

import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Router, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms'; // Importe o FormsModule
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import jsPDF from 'jspdf';
import {DOC_EXPORT_STYLES} from './doc-export.styles';
import {environment} from '../enviroment/enviroment.prd'; // Importa os estilos

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // Adicione o FormsModule aqui
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];
  // Propriedades para a configuração do Jira
  jiraDomain: string = 'https://jeanheberth19.atlassian.net';
  jiraProjectId: string = '';
  jiraTestCaseIssueTypeId: string = '';

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
    // Validação para garantir que os campos de configuração foram preenchidos
    if (!this.jiraDomain || !this.jiraProjectId || !this.jiraTestCaseIssueTypeId) {
      alert('Por favor, preencha as configurações do Jira (Domínio, ID do Projeto e ID do Tipo de Issue) antes de exportar.');
      return '#'; // Retorna um link inválido para não fazer nada
    }

    const summary = encodeURIComponent(cenario.titulo);

    // Formata a descrição para o Jira Markup
    const regraDeNegocio = `h2. Regra de Negócio\n${cenario.regraDeNegocio}\n\n`;

    const criterios = `h2. Critérios de Aceitação\n${
      cenario.criteriosAceitacao.split('\n')
        .map((linha: string) => linha.replace(/\*/g, '').trim())
        .filter(Boolean)
        .map((linha: string) => `* ${linha}`)
        .join('\n')
    }\n\n`;

    // Formata os cenários como passos de teste para fácil cópia no Zephyr Scale
    const testSteps = `h2. Passos do Teste (Copiar para o Test Script do Zephyr)\n{panel:title=Script de Teste}\n${
      cenario.cenarios.map((bloco: string) => {
        const textoLimpo = bloco.replace(/\*/g, '').trim();
        if (!textoLimpo) return '';
        if (textoLimpo.startsWith('####')) {
          return `\n*${textoLimpo.replace(/####/g, '').trim()}*\n`; // Título de seção em negrito
        }
        // Formata cada linha como um passo numerado
        return textoLimpo.split('\n').map(l => l.trim()).filter(Boolean).map(l => `# ${l}`).join('\n');
      }).join('\n\n')
    }\n{panel}`;

    const description = encodeURIComponent(`${regraDeNegocio}${criterios}${testSteps}`);

    return `${this.jiraDomain}/secure/CreateIssueDetails!init.jspa?pid=${this.jiraProjectId}&issuetype=${this.jiraTestCaseIssueTypeId}&summary=${summary}&description=${description}`;
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
      case 'jira':
        const url = this.getJiraUrl(cenario);
        if (url !== '#') {
          window.open(url, '_blank');
        }
        break;
      default:
        console.warn(`Formato não suportado: ${formato}`);
    }
  }

  // 📊 Exportar para Excel com prevenção de duplicidade
  // 📊 Exportar para Excel (com estilo, sem quebrar SSR)
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
      }
    }

    // Nome do arquivo
    const nomeArquivo = cenario.titulo.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    doc.save(`${nomeArquivo}.pdf`);
  }
}

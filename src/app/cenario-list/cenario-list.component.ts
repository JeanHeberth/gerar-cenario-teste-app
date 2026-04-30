import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Router, RouterModule} from '@angular/router';
import {FormsModule} from '@angular/forms';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import {DOC_EXPORT_STYLES} from './doc-export.styles';
import {environment} from '../enviroment/enviroment.prd';

@Component({
  selector: 'app-cenario-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cenario-list.component.html',
  styleUrls: ['./cenario-list.component.css']
})
export class CenarioListComponent implements OnInit {
  cenarios: any[] = [];

  constructor(private http: HttpClient, private router: Router) {
  }

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/cenario`).subscribe({
      next: (res) => (this.cenarios = res.reverse()),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  irParaCriacao(): void {
    this.router.navigate(['/']);
  }

  exportar(cenario: any, formato: string): void {
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

  private exportarParaExcel(cenario: any): void {
    try {
      const cabecalho = [
        'Variáveis',
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
        'Cobertura',
        'Status'
      ];

      const linhas: any[][] = [cabecalho];
      const cenariosLista: any[] = Array.isArray(cenario?.cenarios) ? cenario.cenarios : [];

      if (cenariosLista.length === 0) {
        alert('Nenhum cenário encontrado para exportar.');
        return;
      }

      cenariosLista.forEach((item: any) => {
        const c = this.normalizarCenario(item);

        linhas.push([
          this.formatarVariaveis(c.variaveis),
          c.nome,
          c.objetivo,
          c.precondicao,
          this.formatarBDD(c.scriptTeste),
          this.formatarResultadoEsperado(c.resultadoEsperado),
          c.componente,
          c.rotulos,
          c.proposito,
          c.pasta,
          'JIRAUSER23105',
          c.cobertura,
          c.status
        ]);
      });

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(linhas);

      if (ws['!ref']) {
        const range = XLSX.utils.decode_range(ws['!ref']);

        for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = XLSX.utils.encode_cell({r, c});
            if (!ws[cellRef]) continue;

            ws[cellRef].s = {
              font: {
                name: 'Calibri',
                sz: r === 0 ? 11 : 10,
                bold: r === 0
              },
              alignment: {
                vertical: 'top',
                horizontal: 'left',
                wrapText: true
              },
              border: {
                top: {style: 'thin', color: {rgb: '999999'}},
                bottom: {style: 'thin', color: {rgb: '999999'}},
                left: {style: 'thin', color: {rgb: '999999'}},
                right: {style: 'thin', color: {rgb: '999999'}}
              },
              fill: r === 0 ? {fgColor: {rgb: 'D9EAD3'}} : undefined
            };
          }
        }

        ws['!rows'] = Array(range.e.r + 1).fill({hpt: 45});
        ws['!rows'][0] = {hpt: 24};
      }

      ws['!cols'] = [
        {wch: 45},
        {wch: 40},
        {wch: 45},
        {wch: 35},
        {wch: 75},
        {wch: 65},
        {wch: 30},
        {wch: 30},
        {wch: 35},
        {wch: 40},
        {wch: 22},
        {wch: 25},
        {wch: 20}
      ];

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cenários');

      const buffer = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      FileSaver.saveAs(blob, `${this.nomeArquivo(cenario?.titulo)}_ZephyrScale.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('Erro ao gerar a planilha. Veja o console do navegador.');
    }
  }

  private exportarParaPDF(cenario: any): void {
    try {
      const doc = new jsPDF();
      const margem = 15;
      const larguraMax = doc.internal.pageSize.getWidth() - 2 * margem;
      const alturaPagina = doc.internal.pageSize.getHeight();
      let y = 20;

      const adicionarTexto = (texto: string, tamanho = 11, negrito = false) => {
        doc.setFont('helvetica', negrito ? 'bold' : 'normal');
        doc.setFontSize(tamanho);

        const linhas = doc.splitTextToSize(texto || '', larguraMax);

        linhas.forEach((linha: string) => {
          if (y > alturaPagina - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(linha, margem, y);
          y += 6;
        });

        y += 3;
      };

      adicionarTexto(cenario?.titulo || 'Cenário de Teste', 16, true);
      adicionarTexto('Regra de Negócio:', 13, true);
      adicionarTexto(cenario?.regraDeNegocio || '', 11, false);

      const cenariosLista = Array.isArray(cenario?.cenarios) ? cenario.cenarios : [];

      cenariosLista.forEach((item: any, index: number) => {
        const c = this.normalizarCenario(item);

        adicionarTexto(`Cenário ${index + 1}: ${c.nome}`, 13, true);
        adicionarTexto('Variáveis:', 11, true);
        adicionarTexto('Variáveis:', 11, true);
        adicionarTexto(this.formatarVariaveis(c.variaveis));
        adicionarTexto(`Objetivo: ${c.objetivo}`);
        adicionarTexto(`Precondição: ${c.precondicao}`);
        adicionarTexto('Script de Teste:', 11, true);
        adicionarTexto(this.formatarBDD(c.scriptTeste));
        adicionarTexto('Resultado Esperado:', 11, true);
        adicionarTexto(this.formatarResultadoEsperado(c.resultadoEsperado));
        adicionarTexto(`Componente: ${c.componente}`);
        adicionarTexto(`Rótulos: ${c.rotulos}`);
        adicionarTexto(`Propósito: ${c.proposito}`);
        adicionarTexto(`Pasta: ${c.pasta}`);
        adicionarTexto(`Proprietário: JIRAUSER23105`);
        adicionarTexto(`Cobertura: ${c.cobertura}`);
        adicionarTexto(`Status: ${c.status}`);
      });

      doc.save(`${this.nomeArquivo(cenario?.titulo)}_ZephyrScale.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao gerar PDF. Veja o console do navegador.');
    }
  }

  private exportarParaDoc(cenario: any): void {
    try {
      const cenariosLista = Array.isArray(cenario?.cenarios) ? cenario.cenarios : [];

      const cenariosHtml = cenariosLista.map((item: any, index: number) => {
        const c = this.normalizarCenario(item);

        return `
          <h3>Cenário ${index + 1}: ${this.escapeHtml(c.nome)}</h3>
          <p><strong>Variáveis:</strong></p><pre>${this.escapeHtml(this.formatarVariaveis(c.variaveis))}</pre>
          <p><strong>Objetivo:</strong> ${this.escapeHtml(c.objetivo)}</p>
          <p><strong>Precondição:</strong> ${this.escapeHtml(c.precondicao)}</p>
          <p><strong>Script de Teste:</strong></p>
          <pre>${this.escapeHtml(this.formatarBDD(c.scriptTeste))}</pre>
          <p><strong>Resultado Esperado:</strong></p>
          <pre>${this.escapeHtml(this.formatarResultadoEsperado(c.resultadoEsperado))}</pre>
          <p><strong>Componente:</strong> ${this.escapeHtml(c.componente)}</p>
          <p><strong>Rótulos:</strong> ${this.escapeHtml(c.rotulos)}</p>
          <p><strong>Propósito:</strong> ${this.escapeHtml(c.proposito)}</p>
          <p><strong>Pasta:</strong> ${this.escapeHtml(c.pasta)}</p>
          <p><strong>Proprietário:</strong> JIRAUSER23105</p>
          <p><strong>Cobertura:</strong> ${this.escapeHtml(c.cobertura)}</p>
          <p><strong>Status:</strong> ${this.escapeHtml(c.status)}</p>
        `;
      }).join('<hr/>');

      const conteudo = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${DOC_EXPORT_STYLES}</style>
        </head>
        <body>
          <h1>${this.escapeHtml(cenario?.titulo || 'Cenário de Teste')}</h1>
          <h2>Regra de Negócio</h2>
          <p>${this.escapeHtml(cenario?.regraDeNegocio || '')}</p>
          <h2>Cenários de Teste</h2>
          ${cenariosHtml}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + conteudo], {type: 'application/msword'});
      FileSaver.saveAs(blob, `${this.nomeArquivo(cenario?.titulo)}_ZephyrScale.doc`);
    } catch (error) {
      console.error('Erro ao exportar DOC:', error);
      alert('Erro ao gerar DOC. Veja o console do navegador.');
    }
  }

  private normalizarCenario(item: any): any {
    if (typeof item === 'string') {
      return {
        variaveis: this.extrairCampoTexto(item, 'Variáveis') || 'Não se aplica',
        nome: this.extrairCampoTexto(item, 'Nome'),
        objetivo: this.extrairCampoTexto(item, 'Objetivo'),
        precondicao: this.extrairCampoTexto(item, 'Precondição'),
        scriptTeste: this.extrairCampoTexto(item, 'Script de Teste \\(Passo-a-Passo\\)'),
        resultadoEsperado: this.extrairCampoTexto(item, 'Script de Teste \\(Passo-a-Passo\\) - Resultado'),
        componente: this.extrairCampoTexto(item, 'Componente'),
        rotulos: this.extrairCampoTexto(item, 'Rótulos'),
        proposito: this.extrairCampoTexto(item, 'Propósito') || 'TESTE MANUAL',
        pasta: this.extrairCampoTexto(item, 'Pasta'),
        proprietario: 'JIRAUSER23105',
        cobertura: this.extrairCampoTexto(item, 'Cobertura'),
        status: this.extrairCampoTexto(item, 'Status') || 'APPROVED'
      };
    }

    return {
      variaveis: item?.variaveis || 'Não se aplica',
      nome: item?.nome || '',
      objetivo: item?.objetivo || '',
      precondicao: item?.precondicao || '',
      scriptTeste: item?.scriptTeste || '',
      resultadoEsperado: item?.resultadoEsperado || '',
      componente: item?.componente || '',
      rotulos: item?.rotulos || '',
      proposito: item?.proposito || 'TESTE MANUAL',
      pasta: item?.pasta || '',
      proprietario: 'JIRAUSER23105',
      cobertura: item?.cobertura || '',
      status: item?.status || 'APPROVED'
    };
  }

  private extrairCampoTexto(bloco: string, campo: string): string {
    const campos = [
      'Nome',
      'Objetivo',
      'Precondição',
      'Script de Teste \\(Passo-a-Passo\\)',
      'Script de Teste \\(Passo-a-Passo\\) - Resultado',
      'Variáveis',
      'Componente',
      'Rótulos',
      'Propósito',
      'Pasta',
      'Proprietário',
      'Cobertura',
      'Status'
    ];

    const index = campos.findIndex(c => c === campo);

    if (index === -1) {
      return '';
    }

    const proximos = campos.slice(index + 1).join('|');

    const regex = proximos
      ? new RegExp(`${campo}:\\s*([\\s\\S]*?)(?=\\n(?:${proximos}):|$)`, 'i')
      : new RegExp(`${campo}:\\s*([\\s\\S]*?)$`, 'i');

    return (bloco.match(regex)?.[1] || '').trim();
  }

  private formatarBDD(texto: string): string {
    if (!texto) return '';

    let formatado = this.quebrarPalavrasChaveBDD(texto);

    formatado = formatado
      .replace(/\n?Então[\s\S]*$/i, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    return formatado;
  }

  private formatarResultadoEsperado(texto: string): string {
    if (!texto) return '';

    let limpo = texto
      .replace(/\r/g, '')
      .replace(/Variáveis:[\s\S]*$/i, '')
      .trim();

    limpo = this.quebrarPalavrasChaveBDD(limpo);

    limpo = limpo.replace(/^Então\s*Então\s*/i, 'Então ');

    if (!limpo.match(/^Então\b/i)) {
      limpo = `Então ${limpo}`;
    }

    return limpo
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private formatarVariaveis(texto: string): string {
    if (!texto) return 'Não se aplica';

    return texto
      .replace(/\r/g, '')
      .replace(/\s*;\s*/g, ';\n') // quebra em cada ;
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private quebrarPalavrasChaveBDD(texto: string): string {
    return (texto || '')
      .replace(/\r/g, '')
      .replace(/\s+/g, ' ')
      .replace(/([a-zA-ZÀ-ÿ0-9>])\s*(Dado que)/gi, '$1\n$2')
      .replace(/([a-zA-ZÀ-ÿ0-9>])\s*(Quando)/gi, '$1\n$2')
      .replace(/([a-zA-ZÀ-ÿ0-9>])\s*(Então)/gi, '$1\n$2')
      .replace(/([a-zA-ZÀ-ÿ0-9>])E\s+/g, '$1\nE ')
      .replace(/^\s*(Dado que)/gi, 'Dado que')
      .replace(/\s+(Dado que)/gi, '\nDado que')
      .replace(/\s+(Quando)/gi, '\nQuando')
      .replace(/\s+(Então)/gi, '\nEntão')
      .replace(/\s+(E)\s+/g, '\nE ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private escapeHtml(texto: string): string {
    return (texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private nomeArquivo(titulo: string): string {
    return (titulo || 'cenario')
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');
  }
}

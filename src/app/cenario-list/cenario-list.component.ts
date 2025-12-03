import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as FileSaver from 'file-saver';
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
      next: (res) => this.cenarios = res.reverse(),
      error: (err) => console.error('Erro ao buscar cenários:', err)
    });
  }

  irParaCriacao(): void {
    this.router.navigate(['/']);
  }

  // ======================================================
  // 🔵 EXPORTAÇÃO PARA EXCEL (com estilo e campos fixos)
  // ======================================================
  async exportarParaExcel(cenario: any): Promise<void> {

    const XLSX = await import('xlsx-js-style');

    const cabecalho = [
      "Nome",
      "Objetivo",
      "Precondição",
      "Passo-a-Passo",
      "Resultado Esperado",
      "Componente",
      "Rótulos",
      "Propósito",
      "Pasta",
      "Proprietário",
      "Cobertura (Issues)",
      "Status"
    ];

    const linhas: any[][] = [cabecalho];

    const blocos = (cenario.cenarios?.[0] || "")
      .split(/\n---\n/)
      .map((b: string) => b.trim())
      .filter((b: string | any[]) => b.length > 0);

    blocos.forEach((bloco: string) => {

      const nome = (bloco.match(/Nome:\s*(.*)/i)?.[1] || "").trim();
      const objetivo = (bloco.match(/Objetivo:\s*([\s\S]*?)(?=\nPrecondição:|$)/i)?.[1] || "").trim();
      const precondicao = (bloco.match(/Precondição:\s*([\s\S]*?)(?=\nScript de Teste|$)/i)?.[1] || "").trim();

      let passoAPasso = (
        bloco.match(/Script de Teste \(Passo-a-Passo\):([\s\S]*?)(?=\nScript de Teste \(Passo-a-Passo\) - Resultado:|$)/i)?.[1] || ""
      )
        .trim()
        .replace(/(?<=,|\.)\s*(E|Quando)\b/g, "\n$1")
        .replace(/(Dado que)/, "$1")
        .replace(/,\s*Quando/g, ",\nQuando");

      let resultadoEsperado = (
        bloco.match(/Resultado:\s*([\s\S]*?)(?=\nComponente:|$)/i)?.[1] ||
        bloco.match(/Script de Teste \(Passo-a-Passo\) - Resultado:\s*([\s\S]*?)(?=\nComponente:|$)/i)?.[1] ||
        ""
      )
        .trim()
        .replace(/(?<=,|\.)\s*(Então|E|E não|E o sistema)\b/gi, "\n$1")
        .replace(/(Então)/, "$1");

      const componente = (bloco.match(/Componente:\s*(.*)/i)?.[1] || "").trim();
      const rotulos = (bloco.match(/Rótulos:\s*(.*)/i)?.[1] || "").trim();
      const pasta = (bloco.match(/Pasta:\s*(.*)/i)?.[1] || "").trim();
      const cobertura = (bloco.match(/Cobertura:\s*(.*)/i)?.[1] || "").trim();

      // 🟢 CAMPOS FIXOS
      const proposito = "TESTE MANUAL";
      const proprietario = "JIRAUSER23105";
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

    // Criar worksheet
    const ws: any = XLSX.utils.aoa_to_sheet(linhas);

    // Estilos de células
    const border = { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} };

    const headerStyle = {
      font: { bold: true, sz: 14 },
      fill: { fgColor: { rgb: "D9D9D9" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border
    };

    const cellStyle = {
      font: { sz: 14 },
      alignment: { vertical: "top", wrapText: true },
      border
    };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) continue;
        ws[ref].s = R === 0 ? headerStyle : cellStyle;
      }
    }

    ws["!cols"] = [
      { wch: 40 }, { wch: 45 }, { wch: 40 },
      { wch: 70 }, { wch: 70 },
      { wch: 35 }, { wch: 30 }, { wch: 30 },
      { wch: 45 }, { wch: 35 }, { wch: 25 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cenários");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    FileSaver.saveAs(new Blob([buffer]), `${cenario.titulo}_ZephyrScale.xlsx`);
  }

  // ======================================================
  // 🔵 EXPORTAÇÃO PARA DOC
  // ======================================================
  exportarParaDoc(cenario: any): void {
    const criteriosAdicionados = new Set<string>();

    const criteriosHtml = cenario.criteriosAceitacao
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: any) => l)
      .join("\n");

    const blocosHtml = cenario.cenarios
      .map((c: string) => `<pre>${c}</pre>`)
      .join("");

    const conteudo = `
      <html>
        <head>
          <style>${DOC_EXPORT_STYLES}</style>
        </head>
        <body>
          <h1>${cenario.titulo}</h1>
          <h2>Regra de Negócio</h2>
          <p>${cenario.regraDeNegocio}</p>
          <h2>Critérios de Aceitação</h2>
          <pre>${criteriosHtml}</pre>
          <h2>Cenários</h2>
          ${blocosHtml}
        </body>
      </html>
    `;

    FileSaver.saveAs(
      new Blob(['\ufeff' + conteudo], { type: "application/msword" }),
      `${cenario.titulo}.doc`
    );
  }

  // ======================================================
  // 🔵 EXPORTAÇÃO PARA PDF
  // ======================================================
  exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margem = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(cenario.titulo, margem, 20);

    doc.setFontSize(12);
    doc.text("Regra de Negócio:", margem, 35);
    doc.text(cenario.regraDeNegocio, margem, 45, { maxWidth: 170 });

    doc.save(`${cenario.titulo}.pdf`);
  }

  exportar(cenario: any, formato: string) {
    switch (formato) {
      case "xlsx": this.exportarParaExcel(cenario); break;
      case "doc": this.exportarParaDoc(cenario); break;
      case "pdf": this.exportarParaPDF(cenario); break;
    }
  }
}

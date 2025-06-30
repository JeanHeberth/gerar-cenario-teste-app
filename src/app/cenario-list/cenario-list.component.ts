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
    this.http.get<any[]>('http://192.168.1.9:8089/cenario').subscribe({
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

    const blocos = cenario.cenarioGerado
      .split(/\n\s*\n/) // separa por 2 quebras de linha
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    const dados = blocos.map((bloco: string) => ({
      Título: titulo,
      'Regra de Negócio': regra,
      Cenário: bloco
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
    const conteudo = `
      <h1>${cenario.titulo}</h1>
      <p><strong>Regra de Negócio:</strong> ${cenario.regraDeNegocio}</p>
      <pre>${cenario.cenarioGerado}</pre>
    `;

    const blob = new Blob(['\ufeff' + conteudo], { type: 'application/msword' });
    FileSaver.saveAs(blob, `${cenario.titulo.replace(/\s+/g, '_')}.doc`);
  }

  // 🧾 Exportar para PDF (.pdf)
  private exportarParaPDF(cenario: any): void {
    const doc = new jsPDF();
    const margemEsq = 15;
    let alturaAtual = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(cenario.titulo, margemEsq, alturaAtual);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    alturaAtual += 10;
    doc.text('Regra de Negócio:', margemEsq, alturaAtual);
    alturaAtual += 8;

    const regra = doc.splitTextToSize(cenario.regraDeNegocio, 180);
    doc.text(regra, margemEsq, alturaAtual);

    alturaAtual += regra.length * 7 + 10;
    doc.text('Cenários:', margemEsq, alturaAtual);
    alturaAtual += 8;

    const blocos = cenario.cenarioGerado
      .split(/\n\s*\n/)
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0);

    for (const bloco of blocos) {
      const linhas = doc.splitTextToSize(bloco, 180);
      if (alturaAtual + linhas.length * 7 > 280) {
        doc.addPage();
        alturaAtual = 20;
      }
      doc.text(linhas, margemEsq, alturaAtual);
      alturaAtual += linhas.length * 7 + 10;
    }

    doc.save(`${cenario.titulo.replace(/\s+/g, '_')}.pdf`);
  }
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AqbModalComponent } from '../../../../shared/ui/modal/aqb-modal.component';
import { AqbButtonComponent } from '../../../../shared/ui/button/aqb-button.component';
import { NavegacaoPastas } from '../../models/auto-qa-pastas.model';

/**
 * Seletor de pasta do projeto: evita ter que digitar o caminho absoluto
 * inteiro à mão.
 *
 * Apresentacional, como os demais modais da feature — não busca nada. Recebe
 * o nível já carregado e emite para onde quer navegar; quem chama o serviço é
 * a página.
 *
 * Não abre o seletor nativo do sistema (o de um app desktop): navegadores não
 * expõem o caminho absoluto do arquivo escolhido, então um picker nativo daria
 * só o nome da pasta, sem onde ela está. A navegação vem do backend, que roda
 * no filesystem e só enumera o que auto-qa.allowed-roots autoriza.
 */
@Component({
  selector: 'app-folder-picker-modal',
  standalone: true,
  imports: [AqbModalComponent, AqbButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-picker-modal.component.html',
  styleUrl: './folder-picker-modal.component.scss',
})
export class FolderPickerModalComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly nivel = input<NavegacaoPastas | null>(null);
  readonly erro = input<string>('');

  /** Navegar para um caminho; null volta para a lista de raízes. */
  readonly navegou = output<string | null>();
  readonly selecionou = output<string>();
  readonly dismissed = output<void>();

  protected onNavegar(caminho: string): void {
    this.navegou.emit(caminho);
  }

  protected onVoltar(): void {
    // caminhoPai null numa raiz autorizada: voltar leva à lista de raízes, e
    // não para o diretório acima — que estaria fora da área permitida.
    this.navegou.emit(this.nivel()?.caminhoPai ?? null);
  }

  protected onSelecionar(): void {
    const caminho = this.nivel()?.caminhoAtual;
    if (caminho) {
      this.selecionou.emit(caminho);
    }
  }

  protected onDismiss(): void {
    this.dismissed.emit();
  }

  protected get podeVoltar(): boolean {
    const nivel = this.nivel();
    return !!nivel && nivel.caminhoAtual !== null;
  }
}

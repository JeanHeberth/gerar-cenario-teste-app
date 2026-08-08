import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AqbModalComponent } from './aqb-modal.component';

@Component({
  standalone: true,
  imports: [AqbModalComponent],
  template: `
    <button type="button" id="opener" (click)="open.set(true)">Abrir</button>

    <aqb-modal
      [open]="open()"
      [busy]="busy()"
      title="Título do teste"
      describedBy="test-description"
      (closed)="open.set(false)"
    >
      <p id="test-description">Descrição do teste.</p>
      <button type="button" id="first">Primeiro</button>
      <button type="button" id="second" disabled>Desabilitado</button>
      <button type="button" id="third">Terceiro</button>
    </aqb-modal>
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly busy = signal(false);
}

describe('AqbModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  function openViaOpener(): void {
    const opener: HTMLButtonElement = fixture.nativeElement.querySelector('#opener');
    opener.focus();
    opener.click();
    fixture.detectChanges();
  }

  function dialog(): HTMLElement {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  function closeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.aqb-modal__close');
  }

  it('não renderiza o diálogo quando open é falso', () => {
    fixture.detectChanges();
    expect(dialog()).toBeNull();
  });

  it('foca automaticamente o primeiro elemento focável ao abrir (o botão de fechar, primeiro em ordem de DOM)', () => {
    openViaOpener();
    expect(document.activeElement).toBe(closeButton());
  });

  it('ignora elementos disabled na lista de elementos focáveis (Tab do botão "Terceiro" volta para o de fechar)', () => {
    openViaOpener();
    const third: HTMLButtonElement = fixture.nativeElement.querySelector('#third');
    third.focus();

    dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(closeButton());
  });

  describe('focus trap', () => {
    it('Tab no último elemento focável volta para o primeiro (wrap-around)', () => {
      openViaOpener();
      const third: HTMLButtonElement = fixture.nativeElement.querySelector('#third');
      third.focus();

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialog().dispatchEvent(event);
      fixture.detectChanges();

      expect(document.activeElement).toBe(closeButton());
      expect(event.defaultPrevented).toBeTrue();
    });

    it('Shift+Tab no primeiro elemento focável volta para o último (wrap-around)', () => {
      openViaOpener();
      expect(document.activeElement).toBe(closeButton());

      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      dialog().dispatchEvent(event);
      fixture.detectChanges();

      const third: HTMLButtonElement = fixture.nativeElement.querySelector('#third');
      expect(document.activeElement).toBe(third);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('Tab em elemento do meio não é interceptado (comportamento nativo do navegador segue)', () => {
      openViaOpener();
      const first: HTMLButtonElement = fixture.nativeElement.querySelector('#first');
      first.focus();

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      dialog().dispatchEvent(event);
      fixture.detectChanges();

      expect(event.defaultPrevented).toBeFalse();
    });
  });

  describe('Escape', () => {
    it('fecha o modal quando busy é falso', () => {
      openViaOpener();
      dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(dialog()).toBeNull();
    });

    it('NÃO fecha o modal quando busy é verdadeiro', () => {
      fixture.componentInstance.busy.set(true);
      openViaOpener();
      dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(dialog()).not.toBeNull();
    });
  });

  describe('botão de fechar', () => {
    it('emite closed ao clicar quando busy é falso', () => {
      openViaOpener();
      closeButton().click();
      fixture.detectChanges();

      expect(dialog()).toBeNull();
    });

    it('NÃO emite closed ao clicar quando busy é verdadeiro', () => {
      fixture.componentInstance.busy.set(true);
      openViaOpener();
      closeButton().click();
      fixture.detectChanges();

      expect(dialog()).not.toBeNull();
    });
  });

  describe('backdrop', () => {
    it('clicar no overlay (fora do diálogo) não fecha o modal — comportamento inalterado nesta fase', () => {
      openViaOpener();
      const overlay: HTMLElement = fixture.nativeElement.querySelector('.aqb-modal__overlay');
      overlay.click();
      fixture.detectChanges();

      expect(dialog()).not.toBeNull();
    });
  });

  describe('retorno de foco', () => {
    it('retorna o foco para o elemento que abriu o modal, ao fechar', () => {
      openViaOpener();
      closeButton().click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#opener'));
    });

    it('não lança erro ao fechar se o elemento que abriu o modal foi removido do DOM', () => {
      openViaOpener();
      fixture.nativeElement.querySelector('#opener').remove();

      expect(() => {
        closeButton().click();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('ARIA', () => {
    it('possui role="dialog" e aria-modal="true"', () => {
      openViaOpener();
      expect(dialog().getAttribute('role')).toBe('dialog');
      expect(dialog().getAttribute('aria-modal')).toBe('true');
    });

    it('aria-labelledby aponta para o id real do título (associação por ID, não aria-label genérico)', () => {
      openViaOpener();
      const labelledBy = dialog().getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      const titleEl = document.getElementById(labelledBy!);
      expect(titleEl?.textContent).toContain('Título do teste');
    });

    it('aria-describedby aponta para o id fornecido pelo consumidor', () => {
      openViaOpener();
      expect(dialog().getAttribute('aria-describedby')).toBe('test-description');
    });
  });
});

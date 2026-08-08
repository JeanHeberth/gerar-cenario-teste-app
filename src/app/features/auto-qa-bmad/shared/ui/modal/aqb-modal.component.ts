import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, inject, input, output } from '@angular/core';

let modalIdCounter = 0;

const FOCUSABLE_SELECTOR = 'button, a[href], input, select, textarea, [tabindex]';

/**
 * Hardening sistêmico de acessibilidade (Fase 12.3.8) — beneficia
 * automaticamente todo consumidor (CancelConfirmModal, ApplyConfirmModal,
 * ExecuteConfirmModal e futuros modais): foco inicial, focus trap,
 * Escape/retorno de foco respeitando uma operação em andamento (`busy`,
 * genérico — nunca acoplado a pendingAction/Apply/Execute/Cancel) e
 * associação real por ID (aria-labelledby/aria-describedby) em vez de
 * aria-label solto. Gestão de foco feita em ngAfterViewChecked (hook nativo
 * do Angular executado após a view — incluindo o conteúdo projetado — ser
 * verificada/renderizada), nunca com timers arbitrários.
 */
@Component({
  selector: 'aqb-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aqb-modal.component.html',
  styleUrl: './aqb-modal.component.scss',
})
export class AqbModalComponent implements AfterViewChecked {
  readonly open = input(false);
  readonly title = input<string>();
  readonly busy = input(false);
  readonly describedBy = input<string>();

  readonly closed = output<void>();

  protected readonly titleId = `aqb-modal-title-${modalIdCounter++}`;

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private previouslyFocusedElement: HTMLElement | null = null;
  private wasOpen = false;

  ngAfterViewChecked(): void {
    const isOpen = this.open();
    if (isOpen && !this.wasOpen) {
      this.previouslyFocusedElement = (document.activeElement as HTMLElement) ?? null;
      this.focusFirstElement();
    } else if (!isOpen && this.wasOpen) {
      this.returnFocus();
    }
    this.wasOpen = isOpen;
  }

  onClose(): void {
    if (this.busy()) {
      return;
    }
    this.closed.emit();
  }

  onEscape(): void {
    this.onClose();
  }

  // Angular tipa o evento de bindings (keydown.tab)/(keydown.shift.tab)
  // como Event genérico (sem informação do modificador composto) — o
  // binding já garante que é um keydown de Tab, daí o cast.
  onTab(event: Event): void {
    const elements = this.focusableElements();
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const last = elements[elements.length - 1];
    if (document.activeElement === last) {
      event.preventDefault();
      elements[0].focus();
    }
  }

  onShiftTab(event: Event): void {
    const elements = this.focusableElements();
    if (elements.length === 0) {
      event.preventDefault();
      return;
    }
    const first = elements[0];
    if (document.activeElement === first) {
      event.preventDefault();
      elements[elements.length - 1].focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const dialog = this.elementRef.nativeElement.querySelector<HTMLElement>('.aqb-modal');
    if (!dialog) {
      return [];
    }
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
    );
  }

  private focusFirstElement(): void {
    const [first] = this.focusableElements();
    if (first) {
      first.focus();
    } else {
      this.elementRef.nativeElement.querySelector<HTMLElement>('.aqb-modal')?.focus();
    }
  }

  private returnFocus(): void {
    const el = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    if (el && document.body.contains(el)) {
      el.focus();
    }
  }
}

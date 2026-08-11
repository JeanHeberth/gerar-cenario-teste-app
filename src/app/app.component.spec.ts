import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent (shell global, Fase 14.3)', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // A navegação é assíncrona — sem aguardá-la explicitamente, aria-current
    // ainda reflete o estado anterior à resolução da rota raiz.
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
  });

  function links(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.app-nav-links a'));
  }

  function visibleText(link: HTMLAnchorElement): string {
    return link.querySelectorAll('span')[1]?.textContent?.trim() ?? '';
  }

  it('renderiza a nav como landmark nomeado', () => {
    const nav = fixture.nativeElement.querySelector('nav.app-nav');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Navegação principal');
  });

  it('envolve o conteúdo roteado em exatamente um landmark main', () => {
    const mains = fixture.nativeElement.querySelectorAll('main');
    expect(mains.length).toBe(1);
    expect(mains[0].querySelector('router-outlet')).not.toBeNull();
  });

  it('renderiza os 4 links com os nomes acessíveis atuais, na ordem atual', () => {
    const items = links();
    expect(items.length).toBe(4);
    expect(items.map(visibleText)).toEqual(['Gerar Cenário', 'Chat IA', 'Cenários', 'Auto QA']);
  });

  it('cada link aponta para o destino atual', () => {
    const items = links();
    expect(items[0].getAttribute('routerLink') ?? items[0].getAttribute('ng-reflect-router-link')).toBeTruthy();
    // routerLink normaliza para href real após a navegação inicial:
    expect(items[0].getAttribute('href')).toBe('/');
    expect(items[1].getAttribute('href')).toBe('/chat-agentes');
    expect(items[2].getAttribute('href')).toBe('/cenarios');
    expect(items[3].getAttribute('href')).toBe('/auto-qa');
  });

  it('o emoji de cada link é decorativo (aria-hidden), fora do nome acessível', () => {
    for (const link of links()) {
      const icon = link.querySelector('.app-nav-link-icon');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      // o nome acessível (texto do segundo <span>, sem aria-hidden) nunca contém emoji:
      expect(visibleText(link)).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-➿]/u);
    }
  });

  it('marca com aria-current="page" somente o link da rota ativa (raiz, no carregamento inicial)', () => {
    const items = links();
    const current = items.filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.length).toBe(1);
    expect(visibleText(current[0])).toBe('Gerar Cenário');
  });
});

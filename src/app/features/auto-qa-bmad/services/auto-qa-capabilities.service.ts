import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../enviroment/enviroment.prd';

/** Framework, os canais que ele automatiza e os comandos de teste que aceita. */
export interface FrameworkOption {
  framework: string;
  automationTypes: string[];
  commands: string[];
}

/**
 * Busca a matriz framework → canais do backend, que é a fonte única da regra.
 *
 * Não replicamos a matriz aqui de propósito: uma cópia no front divergiria no
 * primeiro framework novo, e o usuário só descobriria ao receber 400 numa
 * combinação que o próprio select ofereceu.
 */
@Injectable({ providedIn: 'root' })
export class AutoQaCapabilitiesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auto-qa/capabilities`;

  /** Metadado estático: uma requisição por sessão basta. */
  private readonly frameworks$ = this.http
    .get<FrameworkOption[]>(`${this.baseUrl}/frameworks`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  listarFrameworks(): Observable<FrameworkOption[]> {
    return this.frameworks$;
  }
}

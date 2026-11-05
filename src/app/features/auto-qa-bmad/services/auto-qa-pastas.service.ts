import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../enviroment/enviroment.prd';
import { NavegacaoPastas } from '../models/auto-qa-pastas.model';
import { AUTO_QA_HTTP_TIMEOUT_MS } from './auto-qa-execution.service';

/**
 * Espelha 1:1 AutoQaPastasController (`/api/auto-qa/pastas`), que alimenta o
 * seletor de pastas do formulário de nova execução.
 *
 * A listagem vem do servidor porque o navegador não entrega caminho absoluto:
 * nem input[webkitdirectory] nem showDirectoryPicker() dizem onde a pasta fica
 * no disco. Quem sabe isso é quem roda no filesystem.
 *
 * Sem lógica além de montar a URL e aplicar o mesmo timeout uniforme da
 * feature — a política de o que é navegável vive inteiramente no backend
 * (auto-qa.allowed-roots).
 */
@Injectable({ providedIn: 'root' })
export class AutoQaPastasService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/auto-qa/pastas`;

  /** @param caminho omitido lista as raízes autorizadas. */
  listar(caminho?: string | null): Observable<NavegacaoPastas> {
    let params = new HttpParams();
    if (caminho) {
      params = params.set('caminho', caminho);
    }

    return this.http
      .get<NavegacaoPastas>(this.baseUrl, { params })
      .pipe(timeout(AUTO_QA_HTTP_TIMEOUT_MS));
  }
}

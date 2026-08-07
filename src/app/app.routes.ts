import { Routes } from '@angular/router';
import {CenarioComponent} from './cenario/cenario.component';
import {CenarioListComponent} from './cenario-list/cenario-list.component';
import { ChatAgentesComponent } from './chat-agentes/chat-agentes.component';
import { AutoqaArtifactsComponent } from './autoqa-artifacts/autoqa-artifacts.component';

export const routes: Routes = [
  {path: '', component: CenarioComponent},
  {path: 'chat-agentes', component: ChatAgentesComponent},
  {path: 'cenarios', component: CenarioListComponent},
  {
    path: 'auto-qa',
    loadChildren: () => import('./features/auto-qa-bmad/auto-qa-bmad.routes').then((m) => m.AUTO_QA_BMAD_ROUTES),
  },
  {path: 'autoqa-artifacts', component: AutoqaArtifactsComponent},
];


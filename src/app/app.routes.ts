import { Routes } from '@angular/router';
import {CenarioComponent} from './cenario/cenario.component';
import {CenarioListComponent} from './cenario-list/cenario-list.component';
import { ChatAgentesComponent } from './chat-agentes/chat-agentes.component';

export const routes: Routes = [
  {path: '', component: CenarioComponent},
  {path: 'chat-agentes', component: ChatAgentesComponent},
  {path: 'cenarios', component: CenarioListComponent},
];



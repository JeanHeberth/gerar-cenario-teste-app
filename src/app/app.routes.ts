import { Routes } from '@angular/router';
import {CenarioComponent} from './cenario/cenario.component';
import {CenarioListComponent} from './cenario-list/cenario-list.component';

export const routes: Routes = [
  {path: '', component: CenarioComponent},
  {path: 'cenarios', component: CenarioListComponent},
];

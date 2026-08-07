import { Routes } from '@angular/router';
import { ExecutionListPageComponent } from './pages/execution-list-page/execution-list-page.component';
import { ExecutionDetailPageComponent } from './pages/execution-detail-page/execution-detail-page.component';

export const AUTO_QA_BMAD_ROUTES: Routes = [
  { path: '', component: ExecutionListPageComponent },
  { path: ':executionId', component: ExecutionDetailPageComponent },
];

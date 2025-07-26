import { Routes } from '@angular/router';
import { TransactionComponent } from './transaction.component';
import { keycloakAuthGuard } from '../auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: TransactionComponent,
    canActivate: [keycloakAuthGuard],
  },
];

import { Routes } from '@angular/router';
import { keycloakAuthGuard } from './auth/auth.guard';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';
import { TrackingComponent } from './tracking/tracking.component';

export const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [keycloakAuthGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [keycloakAuthGuard]
  },
  {
    path: 'tracking',
    component: TrackingComponent,
    canActivate: [keycloakAuthGuard]
  },
  {
    path: 'transaction',
    loadChildren: () => import('./transaction/transactions.routes').then(m => m.routes)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

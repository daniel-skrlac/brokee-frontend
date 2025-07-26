import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { SettingsComponent } from './settings/settings.component';
import { TrackingComponent } from './tracking/tracking.component';
import { TransactionsModule } from './transaction/transactions.module';
import { AuthInterceptor } from './auth/auth.interceptor';
import { keycloakAuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'home', component: HomeComponent, canActivate: [keycloakAuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [keycloakAuthGuard] },
  { path: 'tracking', component: TrackingComponent, canActivate: [keycloakAuthGuard] },
  {
    path: 'transaction', loadChildren: () => import('./transaction/transactions.module')
      .then(m => m.TransactionsModule), canActivate: [keycloakAuthGuard]
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  declarations: [AppComponent, HomeComponent, SettingsComponent, TrackingComponent],
  imports: [
    TransactionsModule,
    BrowserModule,
    FormsModule,
    ZXingScannerModule,
    NgChartsModule,
    ReactiveFormsModule,
    NgChartsModule,
    RouterModule.forRoot(routes),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    provideHttpClient(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }

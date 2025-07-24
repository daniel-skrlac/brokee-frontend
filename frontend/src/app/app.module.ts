// src/app/app.module.ts
import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ReactiveFormsModule }  from '@angular/forms';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { SettingsComponent } from './settings/settings.component';
import { TrackingComponent } from './tracking/tracking.component';
import { TransactionsModule } from './transaction/transactions.module';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home',  component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'settings',  component: SettingsComponent,  canActivate: [AuthGuard] },
  { path: 'tracking',  component: TrackingComponent,  canActivate: [AuthGuard] },
  { path: 'transaction', loadChildren: () => import('./transaction/transactions.module')
                                   .then(m => m.TransactionsModule), canActivate: [AuthGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
@NgModule({
  declarations: [AppComponent, HomeComponent, SettingsComponent, TrackingComponent, LoginComponent ],
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
  providers: [provideHttpClient()],
  bootstrap: [AppComponent],
})
export class AppModule {}

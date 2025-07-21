// src/app/app.module.ts
import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { ServiceWorkerModule } from '@angular/service-worker';

const routes: Routes = [{ path: '', component: HomeComponent }];

@NgModule({
  declarations: [AppComponent, HomeComponent],
  imports: [BrowserModule, NgChartsModule, RouterModule.forRoot(routes), ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  // Register the ServiceWorker as soon as the application is stable
  // or after 30 seconds (whichever comes first).
  registrationStrategy: 'registerWhenStable:30000'
})],
  providers: [provideHttpClient()],
  bootstrap: [AppComponent],
})
export class AppModule {}

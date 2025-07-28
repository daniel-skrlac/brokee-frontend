import { ApplicationConfig, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgChartsModule } from 'ng2-charts';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { ServiceWorkerModule } from '@angular/service-worker';

import { routes } from './app.routes';
import { environment } from './environments/environment';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG, IncludeBearerTokenCondition, includeBearerTokenInterceptor, provideKeycloak } from 'keycloak-angular';


const apiCondition: IncludeBearerTokenCondition = {
  urlPattern: new RegExp(`^${environment.apiUrl}/.*`),
  httpMethods: ['GET', 'POST', 'PATCH', 'DELETE']
};


export const appConfig: ApplicationConfig = {
  providers: [
    provideKeycloak({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId
      },
      initOptions: {
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256'
      }
    }),
    provideRouter(routes),

    provideHttpClient(
      withInterceptors([
        includeBearerTokenInterceptor
      ])
    ),
    {
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [apiCondition]
    },

    importProvidersFrom(
      BrowserModule,
      FormsModule,
      ReactiveFormsModule,
      NgChartsModule,
      ZXingScannerModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000',
      })
    ),
  ],
};

import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideKeycloak,
         includeBearerTokenInterceptor } from 'keycloak-angular';
import { routes } from './app.module';
import { environment } from './environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideKeycloak({
      config: environment.keycloak,
      initOptions: {
        onLoad: 'login-required',
        checkLoginIframe: false
      }
    }),
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),
    provideRouter(routes)
  ]
};

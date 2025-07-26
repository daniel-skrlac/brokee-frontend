import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';
import { Chart, registerables } from 'chart.js';
import { KeycloakService } from './app/auth/keycloak.service';

Chart.register(...registerables)

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));

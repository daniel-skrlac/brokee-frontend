import { Chart, registerables } from 'chart.js';

Chart.register(...registerables)

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { OneSignalUserLink } from './app/onesignal-auth.bridge';

bootstrapApplication(AppComponent, appConfig).then(appRef => {
  appRef.injector.get(OneSignalUserLink); // starts the bridge
});
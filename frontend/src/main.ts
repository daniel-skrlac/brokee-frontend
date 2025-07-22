import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables)

platformBrowser()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));

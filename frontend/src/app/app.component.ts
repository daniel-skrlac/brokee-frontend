import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector   : 'app-root',
  templateUrl: './app.component.html',
  styleUrls  : ['./app.component.scss'],
  standalone: false
})
export class AppComponent {

  /** hides bottom nav on /login and /register */
  showNav = true;

  constructor(private router: Router) {
    /* update flag on every navigation‑end event */
    this.router.events
      .pipe(filter(ev => ev instanceof NavigationEnd))
      .subscribe((ev: NavigationEnd) =>
        this.showNav = !ev.urlAfterRedirects.startsWith('/login')
                    && !ev.urlAfterRedirects.startsWith('/register'));
  }
}

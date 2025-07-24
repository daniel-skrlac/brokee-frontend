import { Injectable } from '@angular/core';
import { Router }     from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _logged$ = new BehaviorSubject<boolean>(this.hasToken());
  loggedIn$        = this._logged$.asObservable();

  constructor(private router: Router) {}

  /** Was a token already stored? */
  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  /** Call this after backend validates Google credential */
  login(appJwt: string): void {
    localStorage.setItem('token', appJwt);
    this._logged$.next(true);
    this.router.navigate(['/home']);
  }

  logout(): void {
    localStorage.removeItem('token');
    this._logged$.next(false);
    this.router.navigate(['/login']);
  }
}

import { Component, AfterViewInit }        from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router }                          from '@angular/router';

@Component({
  selector   : 'app-login',
  templateUrl: './login.component.html',
  styleUrls  : ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements AfterViewInit {

  form: FormGroup;
  showPwd  = false;
  gReady   = false;           // spinner until Google button injected

  constructor(private fb: FormBuilder,
              private router: Router) {

    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /* ───────────────────────────────────── Google ── */
  ngAfterViewInit(): void {
    // script is pre‑loaded in index.html; wait one tick
    setTimeout(() => {
      // @ts-ignore global google
      if (!(window as any).google?.accounts?.id) { return; }

      // @ts-ignore
      google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_OAUTH_CLIENT_ID',
        callback : (cred: google.accounts.id.CredentialResponse) =>
                    this.handleGoogle(cred)
      });

      // @ts-ignore
      google.accounts.id.renderButton(
        document.getElementById('g-btn') as HTMLElement,
        {
          theme : 'filled_blue',
          size  : 'large',
          shape : 'pill',
          text  : 'signin_with',
          width : 260
        }
      );

      this.gReady = true;     // hide spinner, reveal button
    });
  }

  /* send Google JWT to backend */
  private handleGoogle(res: google.accounts.id.CredentialResponse): void {
    console.log('[Google JWT]', res.credential);
    /* TODO  call AuthService.loginWithGoogle(res.credential)
       .subscribe(() => this.router.navigateByUrl('/')); */
    this.router.navigateByUrl('/'); // demo redirect
  }

  /* ─────────────────────────────────────────────── */

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const { username, password } = this.form.value;
    console.log('Login →', username, password);
    /* TODO AuthService.login(username, password)
           .subscribe(() => this.router.navigateByUrl('/')); */
    this.router.navigateByUrl('/');   // demo redirect
  }

  /* helpers */
  f(name: string) { return this.form.get(name); }
}

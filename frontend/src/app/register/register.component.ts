// src/app/register/register.component.ts
//-------------------------------------------------------------
import {
    Component, OnInit, AfterViewInit,
    ElementRef, ViewChild
  } from '@angular/core';
  import {
    FormBuilder, Validators, ReactiveFormsModule,
    FormGroup, FormControl, ValidationErrors, AbstractControl
  } from '@angular/forms';
  import { Router } from '@angular/router';
  import { CommonModule } from '@angular/common';
  
  /* strictly‑typed reactive form */
  type RegForm = FormGroup<{
    name     : FormControl<string>;
    email    : FormControl<string>;
    password : FormControl<string>;
    confirm  : FormControl<string>;
  }>;
  
  @Component({
    selector   : 'app-register',
    templateUrl: './register.component.html',
    styleUrls  : ['./register.component.scss'],
    standalone : false
  })
  export class RegisterComponent implements OnInit, AfterViewInit {
  
    @ViewChild('gBtn', { static: false }) gBtn!: ElementRef<HTMLElement>;
  
    form!: RegForm;
    hidePwd        = true;
    hideConfirmPwd = true;
    loadingGoogle  = true;
  
    constructor(private fb: FormBuilder, private router: Router) {}
  
    /* ----------------------------- init ------------------------ */
    ngOnInit(): void {
      this.form = this.fb.nonNullable.group({
        name    : ['', [Validators.required, Validators.minLength(3)]],
        email   : ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm : ['', [Validators.required]],
      }, { validators: this.samePwds });
    }
  
    /* ---------------- Google identity (renders button) -------- */
    ngAfterViewInit(): void {
      if (!document.getElementById('gsi-script')) {
        const s = document.createElement('script');
        s.src   = 'https://accounts.google.com/gsi/client';
        s.id    = 'gsi-script';
        s.async = s.defer = true;
        document.head.appendChild(s);
      }
  
      const wait = setInterval(() => {
        // @ts-ignore  – global inserted by script
        if (window.google?.accounts?.id) {
          clearInterval(wait);
          // @ts-ignore
          google.accounts.id.initialize({
            client_id: 'YOUR_GOOGLE_OAUTH_CLIENT_ID',
            callback : (cred:any)=>this.onGoogle(cred)
          });
          // @ts-ignore
          google.accounts.id.renderButton(
            this.gBtn.nativeElement,
            { theme:'filled_blue', size:'large', shape:'pill', width:240 }
          );
          this.loadingGoogle = false;
        }
      }, 200);
    }
  
    /* ------------- custom validator: pwd === confirm ---------- */
    private samePwds(ctrl: AbstractControl): ValidationErrors|null {
      const p  = ctrl.get('password')?.value;
      const cf = ctrl.get('confirm')?.value;
      return p === cf ? null : { mismatch: true };
    }
  
    /* ------------- helpers for template ---------------------- */
    get f() { return this.form.controls; }
    toggle(field:'pwd'|'confirm') {
      field==='pwd' ? this.hidePwd=!this.hidePwd : this.hideConfirmPwd=!this.hideConfirmPwd;
    }
  
    /* ------------- submit | google --------------------------- */
    submit(): void {
      if (this.form.invalid) { this.form.markAllAsTouched(); return; }
      console.table(this.form.value);           // AuthService.register…
      this.router.navigateByUrl('/');
    }
    private onGoogle(cred:any) {
      console.log('G‑cred register', cred);     // AuthService.googleSignup…
      this.router.navigateByUrl('/');
    }
  
    gotoLogin() { this.router.navigateByUrl('/login'); }
  }
  
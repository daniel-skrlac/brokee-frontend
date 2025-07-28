import Keycloak from 'keycloak-js';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class KeycloakService {
    private keycloak!: Keycloak;

    init(): Promise<boolean> {
        this.keycloak = new Keycloak(environment.keycloak);

        return this.keycloak.init({
            onLoad: 'login-required',
            checkLoginIframe: false
        });
    }

    isLoggedIn() { return !!this.keycloak.token; }

    login() { this.keycloak.login(); }
    logout() { this.keycloak.logout(); }

    getToken() { return this.keycloak.token; }
    getUsername(): string {
        console.log(this.keycloak)
        return (
            (this.keycloak.tokenParsed as any)?.preferred_username ||
            'Unknown'
        );
    }

    getEmail(): string {
        return (
            (this.keycloak.tokenParsed as any)?.email ||
            'no-email@unknown'
        );
    }

}

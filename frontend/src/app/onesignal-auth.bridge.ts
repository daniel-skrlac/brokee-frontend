import { Injectable, inject, effect } from '@angular/core';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType, type ReadyArgs } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { OneSignalLiteService } from './onesignal-lite.service';

@Injectable({ providedIn: 'root' })
export class OneSignalUserLink {
    private readonly events = inject(KEYCLOAK_EVENT_SIGNAL);
    private readonly keycloak = inject<Keycloak>(Keycloak);
    private readonly osLite = inject(OneSignalLiteService);

    private startedOnce = false;

    constructor() {
        effect(() => {
            const e = this.events();
            if (e.type === KeycloakEventType.AuthSuccess) {
                this.startOnce();
            } else if (e.type === KeycloakEventType.AuthLogout || e.type === KeycloakEventType.TokenExpired) {
                this.osLite.deregisterOnLogout({ removeAlias: true, unsubscribe: false });
                this.startedOnce = false;
            }
        });

        if ((this.keycloak as any).authenticated) {
            this.startOnce();
        }
    }

    private startOnce() {
        if (this.startedOnce) return;
        const sub = this.keycloak.tokenParsed?.sub;
        if (!sub) return;
        this.startedOnce = true;
        this.osLite.start(sub);
    }
}

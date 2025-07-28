
import { createAuthGuard, AuthGuardData } from 'keycloak-angular';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';

export const keycloakAuthGuard = createAuthGuard(
  async (
    _route : ActivatedRouteSnapshot,
    state  : RouterStateSnapshot,
    data   : AuthGuardData
  ): Promise<boolean | UrlTree> => {

    if (!data.authenticated) {
      console.log(data.authenticated)
      await data.keycloak.login({
        redirectUri: window.location.origin + state.url
      });
      return false;
    }

    return true;
  }
);

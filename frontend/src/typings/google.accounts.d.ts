// minimal declarations just for what we use
declare namespace google {
    export namespace accounts.id {
      /** Response that comes back from GIS */
      interface CredentialResponse {
        clientId   : string;
        credential : string;   // the JWT
        select_by  : string;
      }
  
      interface InitializeOptions {
        client_id : string;
        callback  : (resp: CredentialResponse) => void;
      }
  
      function initialize(opts: InitializeOptions): void;
      function renderButton(
        parent : HTMLElement,
        opts?  : Record<string, any>
      ): void;
    }
  }
  
  /** Global injected by the Google script */
  declare const google: typeof google;
  
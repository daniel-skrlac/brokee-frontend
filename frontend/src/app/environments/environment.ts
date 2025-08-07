export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api', 
  keycloak: {
    url: 'http://localhost:8081',
    realm: 'brokee',
    clientId: 'brokee-frontend'
  },
   oneSignal: {
    appId: '94fae30e-1708-4d07-afec-4de9d53eaff9',
    allowLocalhost: 'http://localhost:4200',
  }
};
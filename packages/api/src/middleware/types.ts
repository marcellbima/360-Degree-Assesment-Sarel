import type { AuthPrincipal, AuthService, AuthenticationService, HealthService } from '@sarel/core';

// Konfigurasi cookie session yang ditentukan composition root.
export interface ApiAuthConfig {
  cookieName: string;
  cookieSecure: boolean;
}

// Kontrak dependency yang di-inject ke Hono app oleh composition root.
// Service konkret berasal dari packages/core; packages/api tidak tahu adapter infra.
export interface ApiDeps {
  healthService: HealthService;
  authService: AuthService;
  authenticator: AuthenticationService;
  authConfig: ApiAuthConfig;
}

// Variabel context Hono yang dipakai lintas middleware dan handler.
export interface ApiEnv {
  Variables: {
    requestId: string;
    auth?: AuthPrincipal;
  };
}

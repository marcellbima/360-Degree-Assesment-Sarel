import type { HealthService } from '@sarel/core';

// Kontrak dependency yang di-inject ke Hono app oleh composition root.
// Service konkret berasal dari packages/core; packages/api tidak tahu adapter infra.
export interface ApiDeps {
  healthService: HealthService;
}

// Variabel context Hono yang dipakai lintas middleware dan handler.
export interface ApiEnv {
  Variables: {
    requestId: string;
  };
}

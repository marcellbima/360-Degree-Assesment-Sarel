import { createApp } from '@sarel/api';
import { HealthService } from '@sarel/core';
import { D1HealthRepository } from '@sarel/db';

// Cloudflare composition root.
// Tanggung jawabnya hanya merakit adapter konkret lalu menjalankan Hono app.
// Tidak ada business logic di sini.

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const healthRepository = new D1HealthRepository(env.DB);
    const healthService = new HealthService(healthRepository);

    const app = createApp({ healthService });
    return app.fetch(request, env, ctx);
  },
};

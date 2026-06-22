import { Hono } from 'hono';
import { formatError } from './errors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { API_PREFIX } from '@sarel/shared';
import type { ApiDeps, ApiEnv } from './middleware/types';

// App factory. Composition root memanggil createApp dengan service yang sudah dirakit.
export function createApp(deps: ApiDeps): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();

  // Request ID sederhana untuk korelasi log dan error response.
  app.use('*', async (c, next) => {
    c.set('requestId', crypto.randomUUID());
    await next();
  });

  // Mengisi principal dari cookie session bila ada. Otorisasi tetap per-route.
  app.use('*', authMiddleware(deps));

  app.route(API_PREFIX, healthRoutes(deps));
  app.route(API_PREFIX, authRoutes(deps));

  app.notFound((c) => {
    const requestId = c.get('requestId');
    return c.json(
      { code: 'NOT_FOUND' as const, message: 'Resource tidak ditemukan.', requestId },
      404,
    );
  });

  app.onError((err, c) => formatError(err, c));

  return app;
}

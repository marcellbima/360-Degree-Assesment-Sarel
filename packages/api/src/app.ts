import { Hono } from 'hono';
import { formatError } from './errors';
import { authMiddleware } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { userAdminRoutes } from './routes/admin/users';
import { organizationRoutes } from './routes/admin/organizations';
import { programRoutes } from './routes/admin/programs';
import { batchRoutes } from './routes/admin/batches';
import { adminScopeRoutes } from './routes/admin/scopes';
import { participantRoutes } from './routes/admin/participants';
import { evaluatorRelationRoutes } from './routes/admin/evaluator-relations';
import { importRoutes } from './routes/admin/imports';
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
  app.route(API_PREFIX, userAdminRoutes(deps));
  app.route(API_PREFIX, organizationRoutes(deps));
  app.route(API_PREFIX, programRoutes(deps));
  app.route(API_PREFIX, batchRoutes(deps));
  app.route(API_PREFIX, adminScopeRoutes(deps));
  app.route(API_PREFIX, participantRoutes(deps));
  app.route(API_PREFIX, evaluatorRelationRoutes(deps));
  app.route(API_PREFIX, importRoutes(deps));

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

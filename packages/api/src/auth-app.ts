import { Hono } from 'hono';
import { API_PREFIX } from '@sarel/shared';

import { formatError } from './errors';
import { authMiddleware } from './middleware/auth';
import type {
  ApiEnv,
  AuthApiDeps,
  HealthApiDeps,
  PublicFormApiDeps,
} from './middleware/types';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import {
  publicFormAdminRoutes,
} from './routes/admin/public-forms';
import {
  publicFormPublicRoutes,
} from './routes/public-forms';

export type AuthHealthApiDeps =
  AuthApiDeps &
  HealthApiDeps &
  PublicFormApiDeps;

export function createAuthApiApp(
  deps: AuthHealthApiDeps,
): Hono<ApiEnv> {
  const app = new Hono<ApiEnv>();

  app.use('*', async (c, next) => {
    c.set(
      'requestId',
      crypto.randomUUID(),
    );

    await next();
  });

  app.use(
    '*',
    authMiddleware(deps),
  );

  app.route(
    API_PREFIX,
    healthRoutes(deps),
  );

  app.route(
    API_PREFIX,
    authRoutes(deps),
  );

  app.route(
    API_PREFIX,
    publicFormAdminRoutes(deps),
  );

  app.route(
    API_PREFIX,
    publicFormPublicRoutes(deps),
  );

  app.notFound((c) =>
    c.json(
      {
        code: 'NOT_FOUND' as const,
        message:
          'Resource tidak ditemukan.',
        requestId:
          c.get('requestId'),
      },
      404,
    ),
  );

  app.onError(
    (error, c) =>
      formatError(error, c),
  );

  return app;
}

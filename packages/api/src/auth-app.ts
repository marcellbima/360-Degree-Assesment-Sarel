import { Hono } from 'hono';
import type {
  DemoWorkspaceService,
} from '@sarel/core';
import { API_PREFIX } from '@sarel/shared';

import { formatError } from './errors';
import { authMiddleware } from './middleware/auth';
import type {
  ApiDeps,
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
  userAdminRoutes,
} from './routes/admin/users';
import {
  organizationRoutes,
} from './routes/admin/organizations';
import {
  programRoutes,
} from './routes/admin/programs';
import {
  batchRoutes,
} from './routes/admin/batches';
import {
  participantRoutes,
} from './routes/admin/participants';
import {
  evaluatorRelationRoutes,
} from './routes/admin/evaluator-relations';
import {
  importRoutes,
} from './routes/admin/imports';
import {
  demoWorkspaceRoutes,
} from './routes/admin/demo-workspace';
import {
  publicFormPublicRoutes,
} from './routes/public-forms';

export type AuthHealthApiDeps =
  AuthApiDeps &
  HealthApiDeps &
  PublicFormApiDeps &
  Pick<
    ApiDeps,
    | 'userAdminService'
    | 'organizationService'
    | 'programService'
    | 'batchService'
    | 'participantService'
    | 'assessmentTargetService'
    | 'evaluatorRelationService'
    | 'importService'
  > & {
    demoWorkspaceService:
      DemoWorkspaceService;
  };

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
    userAdminRoutes(deps),
  );

  app.route(
    API_PREFIX,
    organizationRoutes(deps),
  );

  app.route(
    API_PREFIX,
    programRoutes(deps),
  );

  app.route(
    API_PREFIX,
    batchRoutes(deps),
  );

  app.route(
    API_PREFIX,
    participantRoutes(deps),
  );

  app.route(
    API_PREFIX,
    evaluatorRelationRoutes(deps),
  );

  app.route(
    API_PREFIX,
    importRoutes(deps),
  );

  app.route(
    API_PREFIX,
    demoWorkspaceRoutes(deps),
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

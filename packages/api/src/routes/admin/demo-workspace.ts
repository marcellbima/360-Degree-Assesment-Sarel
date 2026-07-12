import { Hono } from 'hono';
import type {
  DemoWorkspaceService,
} from '@sarel/core';

import {
  adminContext,
} from '../../lib/admin-context';
import {
  requireAuthenticated,
  requireRole,
} from '../../middleware/auth';
import type {
  ApiEnv,
} from '../../middleware/types';

export interface DemoWorkspaceApiDeps {
  demoWorkspaceService:
    DemoWorkspaceService;
}

export function demoWorkspaceRoutes(
  deps: DemoWorkspaceApiDeps,
): Hono<ApiEnv> {
  const router =
    new Hono<ApiEnv>();

  router.get(
    '/admin/demo-workspace/status',
    requireAuthenticated(),
    requireRole('SUPERADMIN'),
    async (context) =>
      context.json(
        await deps
          .demoWorkspaceService
          .status(),
      ),
  );

  router.post(
    '/admin/demo-workspace/load',
    requireAuthenticated(),
    requireRole('SUPERADMIN'),
    async (context) =>
      context.json(
        await deps
          .demoWorkspaceService
          .load(
            adminContext(context),
          ),
      ),
  );

  router.delete(
    '/admin/demo-workspace',
    requireAuthenticated(),
    requireRole('SUPERADMIN'),
    async (context) =>
      context.json(
        await deps
          .demoWorkspaceService
          .clear(
            adminContext(context),
          ),
      ),
  );

  return router;
}

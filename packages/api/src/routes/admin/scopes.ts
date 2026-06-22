import { Hono } from 'hono';
import { putScopesSchema } from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requireRole } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

// Manajemen admin scope khusus SUPERADMIN.
export function adminScopeRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.adminScopeService;

  router.get(
    '/admin/users/:id/scopes',
    requireAuthenticated(),
    requireRole('SUPERADMIN'),
    async (c) => c.json(await svc.getScopes(c.req.param('id'))),
  );

  router.put(
    '/admin/users/:id/scopes',
    requireAuthenticated(),
    requireRole('SUPERADMIN'),
    async (c) => {
      const input = parseOrThrow(putScopesSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.replaceScopes(c.req.param('id'), input.scopes, adminContext(c)));
    },
  );

  return router;
}

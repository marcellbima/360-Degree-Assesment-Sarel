import { Hono } from 'hono';
import {
  createUserSchema,
  resetPasswordSchema,
  setUserRolesSchema,
  updateUserSchema,
  userListQuerySchema,
} from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function userAdminRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.userAdminService;

  router.get('/admin/users', requireAuthenticated(), requirePermission('user.read'), async (c) => {
    const query = parseOrThrow(userListQuerySchema, c.req.query());
    return c.json(await svc.list(query, adminContext(c)));
  });

  router.post('/admin/users', requireAuthenticated(), requirePermission('user.create'), async (c) => {
    const input = parseOrThrow(createUserSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.create(input, adminContext(c)), 201);
  });

  router.get('/admin/users/:id', requireAuthenticated(), requirePermission('user.read'), async (c) => {
    return c.json(await svc.get(c.req.param('id'), adminContext(c)));
  });

  router.patch('/admin/users/:id', requireAuthenticated(), requirePermission('user.update'), async (c) => {
    const input = parseOrThrow(updateUserSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.update(c.req.param('id'), input, adminContext(c)));
  });

  router.put('/admin/users/:id/roles', requireAuthenticated(), requirePermission('admin.manage'), async (c) => {
    const input = parseOrThrow(setUserRolesSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.setRoles(c.req.param('id'), input.roles, adminContext(c)));
  });

  router.post(
    '/admin/users/:id/reset-password',
    requireAuthenticated(),
    requirePermission('user.update'),
    async (c) => {
      const input = parseOrThrow(resetPasswordSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.resetPassword(c.req.param('id'), input.password, adminContext(c)));
    },
  );

  router.post(
    '/admin/users/:id/revoke-sessions',
    requireAuthenticated(),
    requirePermission('user.update'),
    async (c) => c.json(await svc.revokeSessions(c.req.param('id'), adminContext(c))),
  );

  router.post('/admin/users/:id/activate', requireAuthenticated(), requirePermission('user.update'), async (c) =>
    c.json(await svc.activate(c.req.param('id'), adminContext(c))),
  );

  router.post('/admin/users/:id/deactivate', requireAuthenticated(), requirePermission('user.update'), async (c) =>
    c.json(await svc.deactivate(c.req.param('id'), adminContext(c))),
  );

  return router;
}

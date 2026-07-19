import { Hono } from 'hono';
import {
  createOrganizationSchema,
  organizationListQuerySchema,
  updateOrganizationSchema,
} from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function organizationRoutes(
  deps: Pick<ApiDeps, 'organizationService'>,
): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.organizationService;

  router.get(
    '/admin/organizations',
    requireAuthenticated(),
    requirePermission('organization.read'),
    async (c) => {
      const query = parseOrThrow(organizationListQuerySchema, c.req.query());
      return c.json(await svc.list(query, adminContext(c)));
    },
  );

  router.post(
    '/admin/organizations',
    requireAuthenticated(),
    requirePermission('organization.manage'),
    async (c) => {
      const input = parseOrThrow(createOrganizationSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.create(input, adminContext(c)), 201);
    },
  );

  router.get(
    '/admin/organizations/:id',
    requireAuthenticated(),
    requirePermission('organization.read'),
    async (c) => c.json(await svc.get(c.req.param('id'), adminContext(c))),
  );

  router.patch(
    '/admin/organizations/:id',
    requireAuthenticated(),
    requirePermission('organization.manage'),
    async (c) => {
      const input = parseOrThrow(updateOrganizationSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.update(c.req.param('id'), input, adminContext(c)));
    },
  );

  router.post(
    '/admin/organizations/:id/activate',
    requireAuthenticated(),
    requirePermission('organization.manage'),
    async (c) => c.json(await svc.setArchived(c.req.param('id'), false, adminContext(c))),
  );

  router.post(
    '/admin/organizations/:id/archive',
    requireAuthenticated(),
    requirePermission('organization.manage'),
    async (c) => c.json(await svc.setArchived(c.req.param('id'), true, adminContext(c))),
  );

  return router;
}

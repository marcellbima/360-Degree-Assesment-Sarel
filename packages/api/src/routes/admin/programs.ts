import { Hono } from 'hono';
import { createProgramSchema, programListQuerySchema, updateProgramSchema } from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function programRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.programService;

  router.get('/admin/programs', requireAuthenticated(), requirePermission('program.read'), async (c) => {
    const query = parseOrThrow(programListQuerySchema, c.req.query());
    return c.json(await svc.list(query, adminContext(c)));
  });

  router.post('/admin/programs', requireAuthenticated(), requirePermission('program.manage'), async (c) => {
    const input = parseOrThrow(createProgramSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.create(input, adminContext(c)), 201);
  });

  router.get('/admin/programs/:id', requireAuthenticated(), requirePermission('program.read'), async (c) =>
    c.json(await svc.get(c.req.param('id'), adminContext(c))),
  );

  router.patch('/admin/programs/:id', requireAuthenticated(), requirePermission('program.manage'), async (c) => {
    const input = parseOrThrow(updateProgramSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.update(c.req.param('id'), input, adminContext(c)));
  });

  router.post(
    '/admin/programs/:id/activate',
    requireAuthenticated(),
    requirePermission('program.manage'),
    async (c) => c.json(await svc.setArchived(c.req.param('id'), false, adminContext(c))),
  );

  router.post(
    '/admin/programs/:id/archive',
    requireAuthenticated(),
    requirePermission('program.manage'),
    async (c) => c.json(await svc.setArchived(c.req.param('id'), true, adminContext(c))),
  );

  return router;
}

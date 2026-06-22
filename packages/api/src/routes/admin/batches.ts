import { Hono } from 'hono';
import { batchListQuerySchema, createBatchSchema, updateBatchSchema } from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function batchRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.batchService;

  router.get('/admin/batches', requireAuthenticated(), requirePermission('batch.read'), async (c) => {
    const query = parseOrThrow(batchListQuerySchema, c.req.query());
    return c.json(await svc.list(query, adminContext(c)));
  });

  router.post('/admin/batches', requireAuthenticated(), requirePermission('batch.manage'), async (c) => {
    const input = parseOrThrow(createBatchSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.create(input, adminContext(c)), 201);
  });

  router.get('/admin/batches/:id', requireAuthenticated(), requirePermission('batch.read'), async (c) =>
    c.json(await svc.get(c.req.param('id'), adminContext(c))),
  );

  router.patch('/admin/batches/:id', requireAuthenticated(), requirePermission('batch.manage'), async (c) => {
    const input = parseOrThrow(updateBatchSchema, await c.req.json().catch(() => ({})));
    return c.json(await svc.update(c.req.param('id'), input, adminContext(c)));
  });

  router.post('/admin/batches/:id/activate', requireAuthenticated(), requirePermission('batch.manage'), async (c) =>
    c.json(await svc.setArchived(c.req.param('id'), false, adminContext(c))),
  );

  router.post('/admin/batches/:id/archive', requireAuthenticated(), requirePermission('batch.manage'), async (c) =>
    c.json(await svc.setArchived(c.req.param('id'), true, adminContext(c))),
  );

  return router;
}

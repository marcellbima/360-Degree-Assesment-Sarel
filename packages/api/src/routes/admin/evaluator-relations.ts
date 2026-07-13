import { Hono } from 'hono';
import { createRelationSchema, relationListQuerySchema, updateRelationSchema } from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function evaluatorRelationRoutes(
  deps: Pick<
    ApiDeps,
    'evaluatorRelationService'
  >,
): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.evaluatorRelationService;

  router.get(
    '/admin/programs/:programId/evaluator-relations',
    requireAuthenticated(),
    requirePermission('evaluator.read'),
    async (c) => {
      const query = parseOrThrow(relationListQuerySchema, c.req.query());
      return c.json(await svc.list(c.req.param('programId'), query, adminContext(c)));
    },
  );

  router.post(
    '/admin/programs/:programId/evaluator-relations',
    requireAuthenticated(),
    requirePermission('evaluator.manage'),
    async (c) => {
      const input = parseOrThrow(createRelationSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.create(c.req.param('programId'), input, adminContext(c)), 201);
    },
  );

  router.get(
    '/admin/evaluator-relations/:id',
    requireAuthenticated(),
    requirePermission('evaluator.read'),
    async (c) => c.json(await svc.get(c.req.param('id'), adminContext(c))),
  );

  router.patch(
    '/admin/evaluator-relations/:id',
    requireAuthenticated(),
    requirePermission('evaluator.manage'),
    async (c) => {
      const input = parseOrThrow(updateRelationSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.update(c.req.param('id'), input.assessmentType, adminContext(c)));
    },
  );

  router.post(
    '/admin/evaluator-relations/:id/activate',
    requireAuthenticated(),
    requirePermission('evaluator.manage'),
    async (c) => c.json(await svc.setStatus(c.req.param('id'), false, adminContext(c))),
  );

  router.post(
    '/admin/evaluator-relations/:id/archive',
    requireAuthenticated(),
    requirePermission('evaluator.manage'),
    async (c) => c.json(await svc.setStatus(c.req.param('id'), true, adminContext(c))),
  );

  return router;
}

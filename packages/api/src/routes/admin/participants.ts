import { Hono } from 'hono';
import {
  createParticipantSchema,
  participantListQuerySchema,
  putTargetsSchema,
  updateParticipantSchema,
} from '@sarel/shared';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

export function participantRoutes(
  deps: Pick<
    ApiDeps,
    | 'participantService'
    | 'assessmentTargetService'
  >,
): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.participantService;
  const targets = deps.assessmentTargetService;

  router.get(
    '/admin/programs/:programId/participants',
    requireAuthenticated(),
    requirePermission('participant.read'),
    async (c) => {
      const query = parseOrThrow(participantListQuerySchema, c.req.query());
      return c.json(await svc.list(c.req.param('programId'), query, adminContext(c)));
    },
  );

  router.post(
    '/admin/programs/:programId/participants',
    requireAuthenticated(),
    requirePermission('participant.manage'),
    async (c) => {
      const input = parseOrThrow(createParticipantSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.create(c.req.param('programId'), input, adminContext(c)), 201);
    },
  );

  router.get(
    '/admin/participants/:id',
    requireAuthenticated(),
    requirePermission('participant.read'),
    async (c) => c.json(await svc.get(c.req.param('id'), adminContext(c))),
  );

  router.patch(
    '/admin/participants/:id',
    requireAuthenticated(),
    requirePermission('participant.manage'),
    async (c) => {
      const input = parseOrThrow(updateParticipantSchema, await c.req.json().catch(() => ({})));
      return c.json(await svc.update(c.req.param('id'), input, adminContext(c)));
    },
  );

  router.post(
    '/admin/participants/:id/activate',
    requireAuthenticated(),
    requirePermission('participant.manage'),
    async (c) => c.json(await svc.setStatus(c.req.param('id'), false, adminContext(c))),
  );

  router.post(
    '/admin/participants/:id/archive',
    requireAuthenticated(),
    requirePermission('participant.manage'),
    async (c) => c.json(await svc.setStatus(c.req.param('id'), true, adminContext(c))),
  );

  router.get(
    '/admin/participants/:id/targets',
    requireAuthenticated(),
    requirePermission('participant.read'),
    async (c) => c.json(await targets.get(c.req.param('id'), adminContext(c))),
  );

  router.put(
    '/admin/participants/:id/targets',
    requireAuthenticated(),
    requirePermission('participant.manage'),
    async (c) => {
      const input = parseOrThrow(putTargetsSchema, await c.req.json().catch(() => ({})));
      return c.json(await targets.put(c.req.param('id'), input.targets, adminContext(c)));
    },
  );

  return router;
}

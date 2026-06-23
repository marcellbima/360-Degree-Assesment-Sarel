import { Hono, type MiddlewareHandler } from 'hono';
import { AppError, evaluatorPreviewSchema, participantPreviewSchema } from '@sarel/shared';
import { hasPermission } from '@sarel/core';
import { parseOrThrow } from '../../lib/validate';
import { adminContext } from '../../lib/admin-context';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiDeps, ApiEnv } from '../../middleware/types';

// Akses job/commit: minimal salah satu permission import (SUPERADMIN = wildcard).
function requireImportAccess(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const principal = c.get('auth');
    if (!principal) {
      throw new AppError('UNAUTHORIZED', 'Sesi telah berakhir atau Anda belum masuk.', 401);
    }
    if (
      !hasPermission(principal, 'participant.import') &&
      !hasPermission(principal, 'evaluator.import')
    ) {
      throw new AppError('FORBIDDEN', 'Anda tidak memiliki akses import.', 403);
    }
    await next();
  };
}

export function importRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const svc = deps.importService;

  router.post(
    '/admin/imports/participants/preview',
    requireAuthenticated(),
    requirePermission('participant.import'),
    async (c) => {
      const input = parseOrThrow(participantPreviewSchema, await c.req.json().catch(() => ({})));
      return c.json(
        await svc.previewParticipants(input.programId, input.fileName, input.rows, adminContext(c)),
      );
    },
  );

  router.post(
    '/admin/imports/evaluators/preview',
    requireAuthenticated(),
    requirePermission('evaluator.import'),
    async (c) => {
      const input = parseOrThrow(evaluatorPreviewSchema, await c.req.json().catch(() => ({})));
      return c.json(
        await svc.previewEvaluators(input.programId, input.fileName, input.rows, adminContext(c)),
      );
    },
  );

  router.get(
    '/admin/import-jobs/:id',
    requireAuthenticated(),
    requireImportAccess(),
    async (c) => c.json(await svc.getJob(c.req.param('id'), adminContext(c))),
  );

  router.post(
    '/admin/import-jobs/:id/commit',
    requireAuthenticated(),
    requireImportAccess(),
    async (c) => c.json(await svc.commit(c.req.param('id'), adminContext(c))),
  );

  return router;
}

import { Hono } from 'hono';
import { createAssessmentAssignmentSchema } from '@sarel/shared';

import { adminContext } from '../../lib/admin-context';
import { parseOrThrow } from '../../lib/validate';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiEnv, AssessmentAssignmentApiDeps } from '../../middleware/types';

export function assessmentAssignmentRoutes(deps: AssessmentAssignmentApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();

  const service = deps.assessmentAssignmentService;

  router.post(
    '/admin/programs/:programId/assessment-assignments',
    requireAuthenticated(),
    requirePermission('assessment.manage'),
    async (c) => {
      const input = parseOrThrow(
        createAssessmentAssignmentSchema,
        await c.req.json().catch(() => ({})),
      );

      return c.json(await service.create(c.req.param('programId'), input, adminContext(c)), 201);
    },
  );

  return router;
}

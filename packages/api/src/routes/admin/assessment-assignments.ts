import { Hono } from 'hono';
import {
  assessmentAssignmentListQuerySchema,
  createAssessmentAssignmentSchema,
} from '@sarel/shared';

import { adminContext } from '../../lib/admin-context';
import { parseOrThrow } from '../../lib/validate';
import { requireAuthenticated, requirePermission } from '../../middleware/auth';
import type { ApiEnv, AssessmentAssignmentApiDeps } from '../../middleware/types';

export function assessmentAssignmentRoutes(deps: AssessmentAssignmentApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();

  const service = deps.assessmentAssignmentService;

  router.get(
    '/admin/public-form-versions',
    requireAuthenticated(),
    requirePermission('assessment.read'),
    async (c) => {
      const query = parseOrThrow(assessmentAssignmentListQuerySchema, c.req.query());

      return c.json(await service.listFormVersions(query));
    },
  );

  router.get(
    '/admin/programs/:programId/assessment-assignment-groups',
    requireAuthenticated(),
    requirePermission('assessment.read'),
    async (c) => {
      const query = parseOrThrow(assessmentAssignmentListQuerySchema, c.req.query());

      return c.json(await service.listGroups(c.req.param('programId'), query, adminContext(c)));
    },
  );

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

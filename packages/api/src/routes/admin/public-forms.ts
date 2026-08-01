import { Hono } from 'hono';
import {
  createPublicFormSchema,
  publicFormListQuerySchema,
  publishPublicFormSchema,
  updatePublicFormDraftSchema,
} from '@sarel/shared';

import { adminContext } from '../../lib/admin-context';
import { parseOrThrow } from '../../lib/validate';
import {
  requireAuthenticated,
  requirePermission,
} from '../../middleware/auth';
import type {
  ApiEnv,
  PublicFormApiDeps,
} from '../../middleware/types';

export function publicFormAdminRoutes(
  deps: PublicFormApiDeps,
): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const service = deps.publicFormService;

  router.get(
    '/admin/public-forms',
    requireAuthenticated(),
    requirePermission('quiz.read'),
    async (c) => {
      const query = parseOrThrow(
        publicFormListQuerySchema,
        c.req.query(),
      );

      return c.json(
        await service.list(query),
      );
    },
  );

  router.post(
    '/admin/public-forms',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) => {
      const input = parseOrThrow(
        createPublicFormSchema,
        await c.req
          .json()
          .catch(() => ({})),
      );

      return c.json(
        await service.create(
          input,
          adminContext(c),
        ),
        201,
      );
    },
  );

  router.get(
    '/admin/public-forms/:id',
    requireAuthenticated(),
    requirePermission('quiz.read'),
    async (c) =>
      c.json(
        await service.get(
          c.req.param('id'),
        ),
      ),
  );

  router.patch(
    '/admin/public-forms/:id',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) => {
      const input = parseOrThrow(
        updatePublicFormDraftSchema,
        await c.req
          .json()
          .catch(() => ({})),
      );

      return c.json(
        await service.updateDraft(
          c.req.param('id'),
          input,
        ),
      );
    },
  );

  router.post(
    '/admin/public-forms/:id/publish',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) => {
      const input = parseOrThrow(
        publishPublicFormSchema,
        await c.req
          .json()
          .catch(() => ({})),
      );

      return c.json(
        await service.publish(
          c.req.param('id'),
          input,
          adminContext(c),
        ),
      );
    },
  );

  router.post(
    '/admin/public-forms/:id/google-sheet',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) =>
      c.json(
        await service.createGoogleSheet(
          c.req.param('id'),
        ),
      ),
  );

  router.post(
    '/admin/public-forms/:id/google-sheet/disconnect',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) =>
      c.json(
        await service.disconnectGoogleSheet(
          c.req.param('id'),
        ),
      ),
  );

  router.post(
    '/admin/public-forms/:id/unpublish',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) =>
      c.json(
        await service.unpublish(
          c.req.param('id'),
        ),
      ),
  );

  router.delete(
    '/admin/public-forms/:id',
    requireAuthenticated(),
    requirePermission('quiz.manage'),
    async (c) =>
      c.json(
        await service.deleteForm(
          c.req.param('id'),
        ),
      ),
  );

  return router;
}

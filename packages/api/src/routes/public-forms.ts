import { Hono } from 'hono';
import {
  submitPublicFormSchema,
} from '@sarel/shared';

import { parseOrThrow } from '../lib/validate';
import type {
  ApiEnv,
  PublicFormApiDeps,
} from '../middleware/types';

export function publicFormPublicRoutes(
  deps: PublicFormApiDeps,
): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();
  const service = deps.publicFormService;


  router.get(
    '/public/forms',
    async (c) =>
      c.json(
        await service.listPublicCatalog(),
      ),
  );

  router.get(
    '/public/forms/:slug',
    async (c) =>
      c.json(
        await service.getPublic(
          c.req.param('slug'),
        ),
      ),
  );

  router.post(
    '/public/forms/:slug/submissions',
    async (c) => {
      const input = parseOrThrow(
        submitPublicFormSchema,
        await c.req
          .json()
          .catch(() => ({})),
      );

      return c.json(
        await service.submitPublic(
          c.req.param('slug'),
          input,
        ),
        201,
      );
    },
  );

  return router;
}

import { Hono } from 'hono';
import type { ApiDeps, ApiEnv } from '../middleware/types';

// Route group untuk health check.
export function healthRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();

  router.get('/health', async (c) => {
    const result = await deps.healthService.check();
    return c.json(result);
  });

  return router;
}

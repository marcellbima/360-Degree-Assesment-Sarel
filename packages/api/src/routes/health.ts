import { Hono } from 'hono';
import type { ApiEnv, HealthApiDeps } from '../middleware/types';

// Route group untuk health check.
export function healthRoutes(deps: HealthApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();

  router.get('/health', async (c) => {
    const result = await deps.healthService.check();
    return c.json(result);
  });

  return router;
}

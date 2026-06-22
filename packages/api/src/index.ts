export { createApp } from './app';
export { formatError } from './errors';
export {
  authMiddleware,
  requireAuthenticated,
  requirePermission,
  requireRole,
} from './middleware/auth';
export type { ApiAuthConfig, ApiDeps, ApiEnv } from './middleware/types';

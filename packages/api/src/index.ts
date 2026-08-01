export { createApp } from './app';
export { formatError } from './errors';
export {
  authMiddleware,
  requireAuthenticated,
  requirePermission,
  requireRole,
} from './middleware/auth';
export type {
  ApiAuthConfig,
  ApiDeps,
  ApiEnv,
  AssessmentAssignmentApiDeps,
  AuthApiDeps,
  HealthApiDeps,
  PublicFormApiDeps,
} from './middleware/types';
export { createAuthApiApp } from './auth-app';
export type { AuthHealthApiDeps } from './auth-app';

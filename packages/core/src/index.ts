// Health (Phase 2)
export type { HealthRepositoryPort } from './ports/health-repository';
export { HealthService } from './services/health-service';
export {
  percent,
  questionnaireCompletionPercent,
  overallSubmissionProgressPercent,
} from './domain/metrics';

// Ports (Phase 3)
export { SystemClock } from './ports/clock';
export type { ClockPort } from './ports/clock';
export type { UserRecord, UserRepositoryPort } from './ports/user-repository';
export type {
  NewSession,
  SessionRecord,
  SessionRepositoryPort,
} from './ports/session-repository';
export type {
  ClearFailuresQuery,
  FailureQuery,
  LoginAttemptRepositoryPort,
  NewLoginAttempt,
} from './ports/login-attempt-repository';
export type { AuditLogRepositoryPort, NewAuditLog } from './ports/audit-log-repository';
export type {
  AdminScopeRecord,
  AdminScopeRepositoryPort,
} from './ports/admin-scope-repository';
export type { TurnstileVerifierPort } from './ports/turnstile-verifier';

// Auth services dan policy (Phase 3)
export {
  DEFAULT_AUTH_CONFIG,
  MIN_PBKDF2_ITERATIONS,
  MIN_SECRET_LENGTH,
  VALID_APP_ENVS,
} from './auth/config';
export type { AppEnv, AuthConfig } from './auth/config';
export { PasswordService } from './auth/password-service';
export { MIN_PASSWORD_LENGTH, validatePasswordStrength } from './auth/password-policy';
export { SessionService } from './auth/session-service';
export type { IssuedSession } from './auth/session-service';
export { AuthenticationService } from './auth/authentication-service';
export { AuthService } from './auth/auth-service';
export type { AuthServiceDeps } from './auth/auth-service';
export {
  ConfigError,
  resolveRuntimeConfig,
} from './auth/runtime-config';
export type { RawRuntimeEnv, RuntimeConfig } from './auth/runtime-config';
export type {
  AuthPrincipal,
  LoginInput,
  LoginResult,
  RequestContext,
} from './auth/types';
export {
  SUPERADMIN_ROLE,
  hasAllPermissions,
  hasAnyRole,
  hasPermission,
  hasRole,
} from './auth/rbac';
export {
  ScopeValidationError,
  assertValidScopeRow,
  isWithinScope,
  scopeKey,
} from './auth/admin-scope-policy';
export type { AdminScopeRow, ScopeTarget, ScopeConsistency } from './auth/admin-scope-policy';

// ---- Phase 4: Master Data & Access Administration ----
// Ports
export type { RoleRepositoryPort, RoleRow } from './ports/role-repository';
export type { SessionAdminRepositoryPort } from './ports/session-admin-repository';
export type {
  AdminUserRow,
  NewUserRow,
  UserAdminRepositoryPort,
  UserListFilter,
  UserPatch,
} from './ports/user-admin-repository';
export type {
  NewOrganization,
  OrganizationListFilter,
  OrganizationPatch,
  OrganizationRepositoryPort,
  OrganizationRow,
} from './ports/organization-repository';
export type {
  NewProgram,
  ProgramListFilter,
  ProgramPatch,
  ProgramRepositoryPort,
  ProgramRow,
} from './ports/program-repository';
export type {
  BatchListFilter,
  BatchPatch,
  BatchRepositoryPort,
  BatchRow,
  NewBatch,
} from './ports/batch-repository';
export type { NewAdminScope } from './ports/admin-scope-repository';

// Admin domain
export type { AdminActor, AdminContext, ScopeFilter } from './admin/types';
export { buildPage, offsetOf, scopeFilterFor } from './admin/types';
export { generateId } from './admin/id';
export { ADMIN_AUDIT_ACTIONS, AdminAuditWriter } from './admin/audit';
export type { AdminAuditAction } from './admin/audit';
export {
  MANAGEABLE_ROLES,
  canManageRole,
  changedRoles,
  isAccessReduced,
  normalizeRoles,
} from './admin/role-assignment';
export { UserAdminService } from './admin/user-admin-service';
export type { UserAdminDeps } from './admin/user-admin-service';
export { OrganizationService } from './admin/organization-service';
export { ProgramService } from './admin/program-service';
export { BatchService } from './admin/batch-service';
export { AdminScopeService } from './admin/admin-scope-service';
export type { AdminScopeDeps } from './admin/admin-scope-service';

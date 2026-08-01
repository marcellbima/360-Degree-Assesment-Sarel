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
export type { NewSession, SessionRecord, SessionRepositoryPort } from './ports/session-repository';
export type {
  ClearFailuresQuery,
  FailureQuery,
  LoginAttemptRepositoryPort,
  NewLoginAttempt,
} from './ports/login-attempt-repository';
export type { AuditLogRepositoryPort, NewAuditLog } from './ports/audit-log-repository';
export type { AdminScopeRecord, AdminScopeRepositoryPort } from './ports/admin-scope-repository';
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
export { ConfigError, resolveRuntimeConfig } from './auth/runtime-config';
export type { RawRuntimeEnv, RuntimeConfig } from './auth/runtime-config';
export type { AuthPrincipal, LoginInput, LoginResult, RequestContext } from './auth/types';
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
export { actorHasPermission } from './admin/types';
export { loadScopeFilter } from './admin/scope-util';

// ---- Phase 5: Participants, Evaluator Relations, Targets, Imports ----
export type {
  AssessmentTypeRepositoryPort,
  AssessmentTypeRow,
} from './ports/assessment-type-repository';
export type {
  NewParticipant,
  ParticipantListFilter,
  ParticipantPatch,
  ParticipantRepositoryPort,
  ParticipantRow,
} from './ports/participant-repository';
export type {
  NewParticipantTarget,
  ParticipantTargetRepositoryPort,
  ParticipantTargetRow,
} from './ports/participant-target-repository';
export type {
  NewRelation,
  RelationListFilter,
  RelationRepositoryPort,
  RelationRow,
} from './ports/evaluator-relation-repository';
export type {
  ImportJobRecord,
  ImportJobRepositoryPort,
  ImportJobRowRecord,
  NewImportJob,
  NewImportJobRow,
} from './ports/import-job-repository';
export type {
  ImportLookupRepositoryPort,
  ImportParticipantRef,
  ImportUserRef,
} from './ports/import-lookup-repository';
export type { ImportCommitRepositoryPort } from './ports/import-commit-repository';
export { ParticipantService } from './admin/participant-service';
export type { ParticipantDeps } from './admin/participant-service';
export { AssessmentTargetService } from './admin/assessment-target-service';
export type { AssessmentTargetDeps } from './admin/assessment-target-service';
export { EvaluatorRelationService } from './admin/evaluator-relation-service';
export type { EvaluatorRelationDeps } from './admin/evaluator-relation-service';
export { ImportService } from './admin/import-service';
export type { ImportDeps } from './admin/import-service';
export {
  classifyEvaluatorRows,
  classifyParticipantRows,
  summarize,
} from './admin/import-validators';
export type {
  ClassifiedRow,
  EvaluatorRowInput,
  ParticipantRowInput,
} from './admin/import-validators';

export type {
  CompletePublicFormSheetSyncAttemptInput,
  ConnectPublicFormGoogleSheetInput,
  NewPublicForm,
  NewPublicFormSubmission,
  PublicFormDefinition,
  PublicFormDraftPatch,
  PublicFormListFilter,
  PublicFormQuestion,
  PublicFormQuestionType,
  PublicFormRepositoryPort,
  PublicFormRow,
  PublicFormSection,
  PublicFormVersionRow,
  PublicFormSubmissionRow,
  PublishPublicFormInput,
} from './ports/public-form-repository';

export { PublicFormService } from './admin/public-form-service';

export type { CreatePublicFormInput, PublicFormListQuery } from './admin/public-form-service';

export type {
  PublicFormCatalogItem,
  PublicFormSubmissionResult,
  PublicFormView,
  PublishPublicFormScheduleInput,
  SubmitPublicFormInput,
  UpdatePublicFormDraftInput,
} from './admin/public-form-service';

export type {
  CreatePublicFormGoogleSheetInput,
  CreatePublicFormGoogleSheetResult,
  PublicFormSheetSyncInput,
  PublicFormSheetSyncPort,
} from './ports/public-form-sheet-sync';

export type {
  DemoWorkspaceRepositoryPort,
  DemoWorkspaceStatus,
} from './ports/demo-workspace-repository';

export { DemoWorkspaceService } from './admin/demo-workspace-service';

export type {
  AssessmentAssignmentFormVersionListFilter,
  AssessmentAssignmentFormVersionListItem,
  AssessmentAssignmentFormVersionRef,
  AssessmentAssignmentGroupCreateResult,
  AssessmentAssignmentGroupListFilter,
  AssessmentAssignmentGroupListItem,
  AssessmentAssignmentRepositoryPort,
  AssessmentAssignmentSelection,
  AssessmentAssignmentTypeCode,
  CreateAssessmentAssignmentGroupRepositoryInput,
  InitialAssessmentAssignmentStatus,
  NewAssessmentAssignmentGroup,
} from './ports/assessment-assignment-repository';

export { AssessmentAssignmentService } from './admin/assessment-assignment-service';

export type {
  AssessmentAssignmentDeps,
  AssessmentAssignmentGroupView,
  AssessmentAssignmentListQuery,
  CreateAssessmentAssignmentInput,
} from './admin/assessment-assignment-service';

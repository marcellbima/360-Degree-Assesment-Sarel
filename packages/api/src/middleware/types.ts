import type {
  AdminScopeService,
  AssessmentAssignmentService,
  AssessmentTargetService,
  AuthPrincipal,
  AuthService,
  AuthenticationService,
  BatchService,
  EvaluatorRelationService,
  HealthService,
  ImportService,
  OrganizationService,
  ParticipantService,
  ProgramService,
  PublicFormService,
  UserAdminService,
} from '@sarel/core';

export interface ApiAuthConfig {
  cookieName: string;
  cookieSecure: boolean;
}

export interface AuthApiDeps {
  authService: AuthService;
  authenticator: AuthenticationService;
  authConfig: ApiAuthConfig;
}

export interface HealthApiDeps {
  healthService: HealthService;
}

export interface PublicFormApiDeps {
  publicFormService: PublicFormService;
}

export interface AssessmentAssignmentApiDeps {
  assessmentAssignmentService:
    AssessmentAssignmentService;
}

export interface ApiDeps
  extends AuthApiDeps,
    HealthApiDeps {
  userAdminService: UserAdminService;
  organizationService: OrganizationService;
  programService: ProgramService;
  batchService: BatchService;
  adminScopeService: AdminScopeService;
  participantService: ParticipantService;
  assessmentTargetService: AssessmentTargetService;
  evaluatorRelationService: EvaluatorRelationService;
  importService: ImportService;
}

export interface ApiEnv {
  Variables: {
    requestId: string;
    auth?: AuthPrincipal;
  };
}

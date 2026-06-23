import type {
  AdminScopeService,
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
  UserAdminService,
} from '@sarel/core';

// Konfigurasi cookie session yang ditentukan composition root.
export interface ApiAuthConfig {
  cookieName: string;
  cookieSecure: boolean;
}

// Kontrak dependency yang di-inject ke Hono app oleh composition root.
// Service konkret berasal dari packages/core; packages/api tidak tahu adapter infra.
export interface ApiDeps {
  healthService: HealthService;
  authService: AuthService;
  authenticator: AuthenticationService;
  authConfig: ApiAuthConfig;
  // Phase 4 (master data & access administration)
  userAdminService: UserAdminService;
  organizationService: OrganizationService;
  programService: ProgramService;
  batchService: BatchService;
  adminScopeService: AdminScopeService;
  // Phase 5
  participantService: ParticipantService;
  assessmentTargetService: AssessmentTargetService;
  evaluatorRelationService: EvaluatorRelationService;
  importService: ImportService;
}

// Variabel context Hono yang dipakai lintas middleware dan handler.
export interface ApiEnv {
  Variables: {
    requestId: string;
    auth?: AuthPrincipal;
  };
}

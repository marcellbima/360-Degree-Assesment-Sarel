import { serve } from '@hono/node-server';
import { createAuthApiApp } from '@sarel/api';
import {
  AdminAuditWriter,
  AssessmentTargetService,
  EvaluatorRelationService,
  ParticipantService,
  AuthService,
  BatchService,
  AuthenticationService,
  DemoWorkspaceService,
  HealthService,
  ImportService,
  OrganizationService,
  PasswordService,
  ProgramService,
  PublicFormService,
  SessionService,
  SystemClock,
  UserAdminService,
  resolveRuntimeConfig,
} from '@sarel/core';
import {
  createPostgresDatabase,
  createPostgresPool,
  PostgresAdminScopeRepository,
  PostgresAssessmentTypeRepository,
  PostgresEvaluatorRelationRepository,
  PostgresParticipantRepository,
  PostgresParticipantTargetRepository,
  PostgresAuditLogRepository,
  PostgresBatchRepository,
  PostgresDemoWorkspaceRepository,
  PostgresHealthRepository,
  PostgresImportCommitRepository,
  PostgresImportJobRepository,
  PostgresImportLookupRepository,
  PostgresLoginAttemptRepository,
  PostgresOrganizationRepository,
  PostgresProgramRepository,
  PostgresPublicFormRepository,
  PostgresRoleRepository,
  PostgresSessionRepository,
  PostgresUserAdminRepository,
  PostgresUserRepository,
} from '@sarel/db';
import {
  SESSION_COOKIE_NAME,
} from '@sarel/shared';

import {
  GoogleAppsScriptPublicFormSheetSync,
} from './adapters/google-apps-script-public-form-sheet-sync';

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    'DATABASE_URL wajib diisi.',
  );
}

const port = Number.parseInt(
  process.env.PORT ?? '8787',
  10,
);

if (
  !Number.isInteger(port) ||
  port <= 0 ||
  port > 65_535
) {
  throw new Error(
    'PORT harus berupa nomor port yang valid.',
  );
}

const runtime =
  resolveRuntimeConfig(process.env);

const pool = createPostgresPool({
  connectionString,
  applicationName:
    'sarel-assessment-node-server',
});

const db =
  createPostgresDatabase(pool);

const clock =
  new SystemClock();

const passwords =
  new PasswordService(
    runtime.pepper,
    runtime.authConfig
      .pbkdf2Iterations,
  );

const sessionService =
  new SessionService(
    clock,
    runtime.sessionSecret,
  );

const users =
  new PostgresUserRepository(db);

const sessions =
  new PostgresSessionRepository(db);

const loginAttempts =
  new PostgresLoginAttemptRepository(db);

const auditLogs =
  new PostgresAuditLogRepository(db);

const authService =
  new AuthService({
    users,
    sessions,
    loginAttempts,
    auditLogs,
    passwords,
    sessionService,
    clock,
    config: runtime.authConfig,
  });

const authenticator =
  new AuthenticationService(
    sessions,
    users,
    sessionService,
    clock,
  );

const healthService =
  new HealthService(
    new PostgresHealthRepository(pool),
  );

const googleSheetsWebAppUrl =
  process.env
    .GOOGLE_SHEETS_WEB_APP_URL
    ?.trim();

const googleSheetsWebhookSecret =
  process.env
    .GOOGLE_SHEETS_WEBHOOK_SECRET
    ?.trim();

const publicFormSheetSync =
  googleSheetsWebAppUrl &&
  googleSheetsWebhookSecret
    ? new GoogleAppsScriptPublicFormSheetSync(
        googleSheetsWebAppUrl,
        googleSheetsWebhookSecret,
      )
    : undefined;

const publicFormService =
  new PublicFormService(
    new PostgresPublicFormRepository(db),
    clock,
    publicFormSheetSync,
  );

const adminAudit =
  new AdminAuditWriter(
    auditLogs,
    clock,
  );

const adminScopes =
  new PostgresAdminScopeRepository(
    db,
  );

const userAdminService =
  new UserAdminService({
    users:
      new PostgresUserAdminRepository(
        db,
      ),
    roles:
      new PostgresRoleRepository(
        db,
      ),
    sessions,
    scopes: adminScopes,
    passwords,
    clock,
    audit: adminAudit,
  });

const organizationRepository =
  new PostgresOrganizationRepository(
    db,
  );

const programRepository =
  new PostgresProgramRepository(
    db,
  );

const batchRepository =
  new PostgresBatchRepository(
    db,
  );

const participantRepository =
  new PostgresParticipantRepository(
    db,
  );

const participantTargetRepository =
  new PostgresParticipantTargetRepository(
    db,
  );

const assessmentTypeRepository =
  new PostgresAssessmentTypeRepository(
    db,
  );

const evaluatorRelationRepository =
  new PostgresEvaluatorRelationRepository(
    db,
  );

const importJobRepository =
  new PostgresImportJobRepository(
    db,
  );

const importLookupRepository =
  new PostgresImportLookupRepository(
    db,
  );

const importCommitRepository =
  new PostgresImportCommitRepository(
    db,
  );

const organizationService =
  new OrganizationService(
    organizationRepository,
    adminScopes,
    clock,
    adminAudit,
  );

const programService =
  new ProgramService(
    programRepository,
    organizationRepository,
    adminScopes,
    clock,
    adminAudit,
  );

const batchService =
  new BatchService(
    batchRepository,
    programRepository,
    adminScopes,
    clock,
    adminAudit,
  );

const participantService =
  new ParticipantService({
    participants:
      participantRepository,
    programs:
      programRepository,
    batches:
      batchRepository,
    users,
    targets:
      participantTargetRepository,
    assessmentTypes:
      assessmentTypeRepository,
    scopes:
      adminScopes,
    clock,
    audit:
      adminAudit,
  });

const assessmentTargetService =
  new AssessmentTargetService({
    participants:
      participantRepository,
    targets:
      participantTargetRepository,
    assessmentTypes:
      assessmentTypeRepository,
    scopes:
      adminScopes,
    clock,
    audit:
      adminAudit,
  });

const evaluatorRelationService =
  new EvaluatorRelationService({
    relations:
      evaluatorRelationRepository,
    participants:
      participantRepository,
    assessmentTypes:
      assessmentTypeRepository,
    scopes:
      adminScopes,
    clock,
    audit:
      adminAudit,
  });

const importService =
  new ImportService({
    importJobs:
      importJobRepository,
    commit:
      importCommitRepository,
    lookups:
      importLookupRepository,
    programs:
      programRepository,
    assessmentTypes:
      assessmentTypeRepository,
    participants:
      participantRepository,
    relations:
      evaluatorRelationRepository,
    scopes:
      adminScopes,
    clock,
    audit:
      adminAudit,
  });

const demoWorkspaceService =
  new DemoWorkspaceService(
    new PostgresDemoWorkspaceRepository(
      db,
    ),
    clock,
    adminAudit,
  );

const app =
  createAuthApiApp({
    healthService,
    publicFormService,
    userAdminService,
    organizationService,
    programService,
    batchService,
    participantService,
    assessmentTargetService,
    evaluatorRelationService,
    importService,
    demoWorkspaceService,
    authService,
    authenticator,
    authConfig: {
      cookieName:
        SESSION_COOKIE_NAME,
      cookieSecure:
        runtime.cookieSecure,
    },
  });

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(
      `Node server aktif di http://localhost:${info.port}`,
    );
  },
);

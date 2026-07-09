import { serve } from '@hono/node-server';
import { createAuthApiApp } from '@sarel/api';
import {
  AuthService,
  AuthenticationService,
  HealthService,
  PasswordService,
  PublicFormService,
  SessionService,
  SystemClock,
  resolveRuntimeConfig,
} from '@sarel/core';
import {
  createPostgresDatabase,
  createPostgresPool,
  PostgresAuditLogRepository,
  PostgresHealthRepository,
  PostgresLoginAttemptRepository,
  PostgresPublicFormRepository,
  PostgresSessionRepository,
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

const app =
  createAuthApiApp({
    healthService,
    publicFormService,
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

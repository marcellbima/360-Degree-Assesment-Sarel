import { createApp } from '@sarel/api';
import {
  AdminAuditWriter,
  AdminScopeService,
  AuthService,
  AuthenticationService,
  BatchService,
  ConfigError,
  HealthService,
  OrganizationService,
  PasswordService,
  ProgramService,
  SessionService,
  SystemClock,
  UserAdminService,
  resolveRuntimeConfig,
  type RuntimeConfig,
} from '@sarel/core';
import {
  D1AdminScopeRepository,
  D1AuditLogRepository,
  D1BatchRepository,
  D1HealthRepository,
  D1LoginAttemptRepository,
  D1OrganizationRepository,
  D1ProgramRepository,
  D1RoleRepository,
  D1SessionRepository,
  D1UserAdminRepository,
  D1UserRepository,
  createDb,
} from '@sarel/db';
import { SESSION_COOKIE_NAME } from '@sarel/shared';

// Cloudflare composition root.
// Merakit adapter D1 konkret dan core service, lalu menjalankan Hono app.
// Tidak ada business logic di sini.
//
// Catatan: validasi secret dan konfigurasi dilakukan saat request diproses
// (resolveRuntimeConfig), bukan pada tahap bundling, sehingga build dry-run
// tetap dapat berjalan tanpa secret nyata.

export interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  PASSWORD_PEPPER?: string;
  PASSWORD_PBKDF2_ITERATIONS?: string;
  SESSION_TTL_SECONDS?: string;
  ADMIN_SESSION_TTL_SECONDS?: string;
  APP_ENV?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let runtime: RuntimeConfig;
    try {
      runtime = resolveRuntimeConfig(env);
    } catch (err) {
      if (err instanceof ConfigError) {
        // Jangan membocorkan detail konfigurasi ke client; catat di log server.
        console.error(`[config] ${err.message}`);
        return Response.json(
          { code: 'INTERNAL_ERROR', message: 'Konfigurasi server tidak valid.' },
          { status: 500 },
        );
      }
      throw err;
    }

    const db = createDb(env.DB);
    const clock = new SystemClock();

    const passwords = new PasswordService(runtime.pepper, runtime.authConfig.pbkdf2Iterations);
    const sessionService = new SessionService(clock, runtime.sessionSecret);

    const users = new D1UserRepository(db);
    const sessions = new D1SessionRepository(db);
    const loginAttempts = new D1LoginAttemptRepository(db);
    const auditLogs = new D1AuditLogRepository(db);

    const authService = new AuthService({
      users,
      sessions,
      loginAttempts,
      auditLogs,
      passwords,
      sessionService,
      clock,
      config: runtime.authConfig,
    });
    const authenticator = new AuthenticationService(sessions, users, sessionService, clock);
    const healthService = new HealthService(new D1HealthRepository(env.DB));

    // Phase 4: master data & access administration.
    const adminScopeRepo = new D1AdminScopeRepository(db);
    const adminUsers = new D1UserAdminRepository(db);
    const roleRepo = new D1RoleRepository(db);
    const organizationRepo = new D1OrganizationRepository(db);
    const programRepo = new D1ProgramRepository(db);
    const batchRepo = new D1BatchRepository(db);
    const auditWriter = new AdminAuditWriter(auditLogs, clock);

    const userAdminService = new UserAdminService({
      users: adminUsers,
      roles: roleRepo,
      sessions,
      scopes: adminScopeRepo,
      passwords,
      clock,
      audit: auditWriter,
    });
    const organizationService = new OrganizationService(
      organizationRepo,
      adminScopeRepo,
      clock,
      auditWriter,
    );
    const programService = new ProgramService(
      programRepo,
      organizationRepo,
      adminScopeRepo,
      clock,
      auditWriter,
    );
    const batchService = new BatchService(batchRepo, programRepo, adminScopeRepo, clock, auditWriter);
    const adminScopeService = new AdminScopeService({
      scopes: adminScopeRepo,
      users: adminUsers,
      organizations: organizationRepo,
      programs: programRepo,
      batches: batchRepo,
      sessions,
      clock,
      audit: auditWriter,
    });

    const app = createApp({
      healthService,
      authService,
      authenticator,
      authConfig: {
        cookieName: SESSION_COOKIE_NAME,
        cookieSecure: runtime.cookieSecure,
      },
      userAdminService,
      organizationService,
      programService,
      batchService,
      adminScopeService,
    });

    return app.fetch(request, env, ctx);
  },
};

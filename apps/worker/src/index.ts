import { createApp } from '@sarel/api';
import {
  AuthService,
  AuthenticationService,
  ConfigError,
  HealthService,
  PasswordService,
  SessionService,
  SystemClock,
  resolveRuntimeConfig,
  type RuntimeConfig,
} from '@sarel/core';
import {
  D1AuditLogRepository,
  D1HealthRepository,
  D1LoginAttemptRepository,
  D1SessionRepository,
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

    const app = createApp({
      healthService,
      authService,
      authenticator,
      authConfig: {
        cookieName: SESSION_COOKIE_NAME,
        cookieSecure: runtime.cookieSecure,
      },
    });

    return app.fetch(request, env, ctx);
  },
};

import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { AppError } from '@sarel/shared';
import { hasAnyRole, hasPermission } from '@sarel/core';
import type { AuthApiDeps, ApiEnv } from './types';

const UNAUTHORIZED_MESSAGE = 'Sesi telah berakhir atau Anda belum masuk.';
const FORBIDDEN_MESSAGE = 'Anda tidak memiliki akses.';

// Mengisi principal dari cookie session bila ada. Tidak menolak request di sini;
// otorisasi tetap dilakukan per-route.
export function authMiddleware(deps: AuthApiDeps): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const token = getCookie(c, deps.authConfig.cookieName);
    if (token) {
      const principal = await deps.authenticator.authenticate(token);
      if (principal) {
        c.set('auth', principal);
      }
    }
    await next();
  };
}

export function requireAuthenticated(): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    if (!c.get('auth')) {
      throw new AppError('UNAUTHORIZED', UNAUTHORIZED_MESSAGE, 401);
    }
    await next();
  };
}

export function requireRole(...roles: string[]): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const principal = c.get('auth');
    if (!principal) {
      throw new AppError('UNAUTHORIZED', UNAUTHORIZED_MESSAGE, 401);
    }
    if (!hasAnyRole(principal.roles, roles)) {
      throw new AppError('FORBIDDEN', FORBIDDEN_MESSAGE, 403);
    }
    await next();
  };
}

export function requirePermission(permission: string): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    const principal = c.get('auth');
    if (!principal) {
      throw new AppError('UNAUTHORIZED', UNAUTHORIZED_MESSAGE, 401);
    }
    if (!hasPermission(principal, permission)) {
      throw new AppError('FORBIDDEN', FORBIDDEN_MESSAGE, 403);
    }
    await next();
  };
}

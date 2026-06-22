import type { Context } from 'hono';
import { AppError } from '@sarel/shared';
import type { AdminContext, AuthPrincipal } from '@sarel/core';
import { getClientIp, getUserAgent } from './http';
import type { ApiEnv } from '../middleware/types';

// Principal wajib ada (route memakai requireAuthenticated lebih dulu).
export function requirePrincipal(c: Context<ApiEnv>): AuthPrincipal {
  const principal = c.get('auth');
  if (!principal) {
    throw new AppError('UNAUTHORIZED', 'Sesi telah berakhir atau Anda belum masuk.', 401);
  }
  return principal;
}

export function adminContext(c: Context<ApiEnv>): AdminContext {
  const principal = requirePrincipal(c);
  return {
    actor: { id: principal.id, userId: principal.userId, roles: principal.roles },
    ip: getClientIp(c),
    userAgent: getUserAgent(c),
    requestId: c.get('requestId') ?? null,
  };
}

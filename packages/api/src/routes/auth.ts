import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { AppError, loginRequestSchema, type MeResponse } from '@sarel/shared';
import { getClientIp, getUserAgent } from '../lib/http';
import { parseOrThrow } from '../lib/validate';
import { requireAuthenticated } from '../middleware/auth';
import type { ApiDeps, ApiEnv } from '../middleware/types';
import type { AuthPrincipal } from '@sarel/core';

function toMeResponse(principal: AuthPrincipal): MeResponse {
  return {
    userId: principal.userId,
    fullName: principal.fullName,
    roles: principal.roles,
    permissions: principal.permissions,
  };
}

export function authRoutes(deps: ApiDeps): Hono<ApiEnv> {
  const router = new Hono<ApiEnv>();

  router.post('/auth/login', async (c) => {
    const raw = await c.req.json().catch(() => ({}));
    const input = parseOrThrow(loginRequestSchema, raw);
    const result = await deps.authService.login({
      userId: input.userId,
      password: input.password,
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
      requestId: c.get('requestId'),
    });

    const maxAge = Math.max(
      0,
      Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000),
    );
    setCookie(c, deps.authConfig.cookieName, result.token, {
      httpOnly: true,
      secure: deps.authConfig.cookieSecure,
      sameSite: 'Lax',
      path: '/',
      maxAge,
    });

    return c.json(toMeResponse(result.principal));
  });

  router.post('/auth/logout', async (c) => {
    const token = getCookie(c, deps.authConfig.cookieName);
    if (token) {
      await deps.authService.logout(token, {
        ip: getClientIp(c),
        userAgent: getUserAgent(c),
        requestId: c.get('requestId'),
      });
    }
    deleteCookie(c, deps.authConfig.cookieName, {
      path: '/',
      sameSite: 'Lax',
      secure: deps.authConfig.cookieSecure,
    });
    return c.json({ ok: true });
  });

  router.get('/auth/me', requireAuthenticated(), (c) => {
    const principal = c.get('auth');
    if (!principal) {
      throw new AppError('UNAUTHORIZED', 'Sesi telah berakhir atau Anda belum masuk.', 401);
    }
    return c.json(toMeResponse(principal));
  });

  return router;
}

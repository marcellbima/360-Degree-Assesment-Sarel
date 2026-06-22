import type { Context } from 'hono';

// IP client. Mengutamakan header Cloudflare, lalu proxy umum.
export function getClientIp(c: Context): string {
  const cf = c.req.header('cf-connecting-ip');
  if (cf) {
    return cf;
  }
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return c.req.header('x-real-ip') ?? 'unknown';
}

export function getUserAgent(c: Context): string | null {
  return c.req.header('user-agent') ?? null;
}

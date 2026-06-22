import { describe, expect, it } from 'vitest';
import { buildHarness, type Harness } from '../admin/harness';

function extractCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  return setCookie ? setCookie.split(';')[0] : '';
}

async function loginReq(h: Harness, userId: string, password: string): Promise<Response> {
  return h.app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, password }),
  });
}

describe('Auth integration', () => {
  it('login berhasil: principal aman, cookie HttpOnly, tanpa token di body', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, 'budi', 'Rahasia123');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.userId).toBe('budi');
    expect('token' in body).toBe(false);
    expect('permissions' in body).toBe(true);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('sarel_session=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('login gagal: 401 generik tanpa membocorkan penyebab', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, 'budi', 'PasswordSalah');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe('User ID atau kata sandi tidak valid.');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('GET /me tanpa session ditolak', async () => {
    const h = await buildHarness();
    const res = await h.app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me dengan session valid mengembalikan principal', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const cookie = await h.login('budi', 'Rahasia123');
    const res = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { userId: string }).userId).toBe('budi');
  });

  it('logout mencabut server session dan menghapus cookie', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const cookie = await h.login('budi', 'Rahasia123');
    const out = await h.app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    const setCookie = out.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('Max-Age=0');
    const me = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it('session expired tidak dianggap valid', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const cookie = await h.login('budi', 'Rahasia123');
    h.clock.current = new Date(h.clock.current.getTime() + 3_700 * 1000);
    const me = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it('lockout setelah lima kegagalan dalam window', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    for (let i = 0; i < 5; i += 1) {
      const failed = await loginReq(h, 'budi', 'PasswordSalah');
      expect(failed.status).toBe(401);
    }
    const locked = await loginReq(h, 'budi', 'Rahasia123');
    expect(locked.status).toBe(429);
  });

  it('cookie login development: HttpOnly, SameSite=Lax, Path=/, tanpa Secure', async () => {
    const h = await buildHarness(false);
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, 'budi', 'Rahasia123');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(/;\s*Secure/i.test(setCookie)).toBe(false);
  });

  it('cookie login production: Secure aktif', async () => {
    const h = await buildHarness(true);
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, 'budi', 'Rahasia123');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(/;\s*Secure/i.test(setCookie)).toBe(true);
  });

  it('response body tidak pernah memuat raw session token', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, 'budi', 'Rahasia123');
    const rawToken = extractCookie(res).split('=')[1] ?? '';
    const text = await res.text();
    expect(rawToken.length).toBeGreaterThan(0);
    expect(text.includes(rawToken)).toBe(false);
  });

  it('User ID dinormalisasi (trim) sebelum lookup', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const res = await loginReq(h, '  budi  ', 'Rahasia123');
    expect(res.status).toBe(200);
  });

  it('user tidak ditemukan dan password salah menghasilkan respons identik', async () => {
    const h = await buildHarness();
    await h.seedUser({ userId: 'budi' });
    const notFound = await loginReq(h, 'tidakada', 'apa-saja-123');
    const wrongPassword = await loginReq(h, 'budi', 'PasswordSalah');
    expect(notFound.status).toBe(wrongPassword.status);
    const a = (await notFound.json()) as { code: string; message: string };
    const b = (await wrongPassword.json()) as { code: string; message: string };
    expect(a.code).toBe(b.code);
    expect(a.message).toBe(b.message);
  });
});

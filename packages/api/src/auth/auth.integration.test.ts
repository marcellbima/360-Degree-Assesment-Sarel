import { describe, expect, it } from 'vitest';
import {
  AuthenticationService,
  AuthService,
  HealthService,
  PasswordService,
  SessionService,
  type AuthConfig,
  type ClearFailuresQuery,
  type ClockPort,
  type FailureQuery,
  type LoginAttemptRepositoryPort,
  type NewAuditLog,
  type NewLoginAttempt,
  type NewSession,
  type SessionRecord,
  type SessionRepositoryPort,
  type AuditLogRepositoryPort,
  type UserRecord,
  type UserRepositoryPort,
} from '@sarel/core';
import { createApp } from '../app';
import type { ApiDeps } from '../middleware/types';

class MutableClock implements ClockPort {
  private current: Date;
  constructor(initial: Date) {
    this.current = initial;
  }
  now(): Date {
    return this.current;
  }
  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

class InMemoryUserRepository implements UserRepositoryPort {
  private byId = new Map<string, UserRecord>();
  private byUserId = new Map<string, UserRecord>();
  private roles = new Map<string, string[]>();
  private permissions = new Map<string, string[]>();

  add(user: UserRecord, roles: string[], permissions: string[]): void {
    this.byId.set(user.id, user);
    this.byUserId.set(user.userId, user);
    this.roles.set(user.id, roles);
    this.permissions.set(user.id, permissions);
  }

  async findByUserId(userId: string): Promise<UserRecord | null> {
    return this.byUserId.get(userId) ?? null;
  }
  async findById(id: string): Promise<UserRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async findRoleCodes(userId: string): Promise<string[]> {
    return this.roles.get(userId) ?? [];
  }
  async findPermissionCodes(userId: string): Promise<string[]> {
    return this.permissions.get(userId) ?? [];
  }
}

class InMemorySessionRepository implements SessionRepositoryPort {
  private byHash = new Map<string, SessionRecord>();
  async create(session: NewSession): Promise<void> {
    this.byHash.set(session.tokenHash, { ...session, revokedAt: null });
  }
  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.byHash.get(tokenHash) ?? null;
  }
  async revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<void> {
    const session = this.byHash.get(tokenHash);
    if (session) {
      session.revokedAt = revokedAt;
    }
  }
}

class InMemoryLoginAttemptRepository implements LoginAttemptRepositoryPort {
  rows: NewLoginAttempt[] = [];
  async record(attempt: NewLoginAttempt): Promise<void> {
    this.rows.push(attempt);
  }
  async countRecentFailures(query: FailureQuery): Promise<number> {
    return this.rows.filter(
      (row) =>
        !row.success &&
        row.createdAt >= query.since &&
        (query.userIdInput === undefined || row.userIdInput === query.userIdInput) &&
        (query.ipAddress === undefined || row.ipAddress === query.ipAddress),
    ).length;
  }
  async clearFailures(query: ClearFailuresQuery): Promise<void> {
    this.rows = this.rows.filter((row) => {
      if (row.success) {
        return true;
      }
      const matchUser = query.userIdInput === undefined || row.userIdInput === query.userIdInput;
      const matchIp = query.ipAddress === undefined || row.ipAddress === query.ipAddress;
      return !(matchUser && matchIp);
    });
  }
}

class InMemoryAuditLogRepository implements AuditLogRepositoryPort {
  rows: NewAuditLog[] = [];
  async record(entry: NewAuditLog): Promise<void> {
    this.rows.push(entry);
  }
}

interface Harness {
  app: ReturnType<typeof createApp>;
  clock: MutableClock;
  users: InMemoryUserRepository;
  passwords: PasswordService;
  audit: InMemoryAuditLogRepository;
}

function buildHarness(
  overrides: Partial<AuthConfig> = {},
  cookieSecure = false,
): Harness {
  const clock = new MutableClock(new Date('2026-06-21T00:00:00Z'));
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const loginAttempts = new InMemoryLoginAttemptRepository();
  const audit = new InMemoryAuditLogRepository();
  const passwords = new PasswordService('test-pepper', 10_000);
  const sessionService = new SessionService(clock, 'session-secret-untuk-test');
  const config: AuthConfig = {
    pbkdf2Iterations: 10_000,
    sessionTtlSeconds: 3_600,
    adminSessionTtlSeconds: 1_800,
    maxFailedAttempts: 5,
    lockoutWindowSeconds: 900,
    lockoutDurationSeconds: 900,
    ...overrides,
  };
  const authService = new AuthService({
    users,
    sessions,
    loginAttempts,
    auditLogs: audit,
    passwords,
    sessionService,
    clock,
    config,
  });
  const authenticator = new AuthenticationService(sessions, users, sessionService, clock);
  const healthService = new HealthService({ ping: async () => true });
  const deps: ApiDeps = {
    healthService,
    authService,
    authenticator,
    authConfig: { cookieName: 'sarel_session', cookieSecure },
  };
  return { app: createApp(deps), clock, users, passwords, audit };
}

async function seedUser(
  h: Harness,
  options: { userId?: string; password?: string; status?: string; roles?: string[] } = {},
): Promise<void> {
  const userId = options.userId ?? 'budi';
  const password = options.password ?? 'Rahasia123';
  const passwordHash = await h.passwords.hash(password);
  h.users.add(
    { id: `user_${userId}`, userId, fullName: 'Budi Santoso', passwordHash, status: options.status ?? 'ACTIVE' },
    options.roles ?? ['USER'],
    [],
  );
}

function jsonInit(body: unknown, cookie?: string): RequestInit {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) {
    headers.cookie = cookie;
  }
  return { method: 'POST', headers, body: JSON.stringify(body) };
}

async function loginRequest(h: Harness, userId: string, password: string): Promise<Response> {
  return h.app.request('/api/auth/login', jsonInit({ userId, password }));
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    return '';
  }
  return setCookie.split(';')[0];
}

describe('Auth integration', () => {
  it('login berhasil: principal aman, cookie HttpOnly, tanpa token di body', async () => {
    const h = buildHarness();
    await seedUser(h);
    const res = await loginRequest(h, 'budi', 'Rahasia123');
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
    const h = buildHarness();
    await seedUser(h);
    const res = await loginRequest(h, 'budi', 'PasswordSalah');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe('User ID atau kata sandi tidak valid.');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('GET /me tanpa session ditolak', async () => {
    const h = buildHarness();
    const res = await h.app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me dengan session valid mengembalikan principal', async () => {
    const h = buildHarness();
    await seedUser(h);
    const loginRes = await loginRequest(h, 'budi', 'Rahasia123');
    const cookie = extractCookie(loginRes);
    const res = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string };
    expect(body.userId).toBe('budi');
  });

  it('logout mencabut session aktif', async () => {
    const h = buildHarness();
    await seedUser(h);
    const loginRes = await loginRequest(h, 'budi', 'Rahasia123');
    const cookie = extractCookie(loginRes);
    const out = await h.app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    expect(out.status).toBe(200);
    const me = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it('session expired tidak dianggap valid', async () => {
    const h = buildHarness({ sessionTtlSeconds: 1 });
    await seedUser(h);
    const loginRes = await loginRequest(h, 'budi', 'Rahasia123');
    const cookie = extractCookie(loginRes);
    h.clock.advanceSeconds(5);
    const me = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it('lockout setelah lima kegagalan dalam window', async () => {
    const h = buildHarness();
    await seedUser(h);
    for (let i = 0; i < 5; i += 1) {
      const failed = await loginRequest(h, 'budi', 'PasswordSalah');
      expect(failed.status).toBe(401);
    }
    // Walaupun password benar, akun terkunci sementara.
    const locked = await loginRequest(h, 'budi', 'Rahasia123');
    expect(locked.status).toBe(429);
  });

  it('cookie login development: HttpOnly, SameSite=Lax, Path=/, tanpa Secure', async () => {
    const h = buildHarness({}, false);
    await seedUser(h);
    const res = await loginRequest(h, 'budi', 'Rahasia123');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toMatch(/Max-Age=\d+/);
    expect(/;\s*Secure/i.test(setCookie)).toBe(false);
  });

  it('cookie login production: HttpOnly, SameSite=Lax, Path=/, Secure', async () => {
    const h = buildHarness({}, true);
    await seedUser(h);
    const res = await loginRequest(h, 'budi', 'Rahasia123');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    expect(/;\s*Secure/i.test(setCookie)).toBe(true);
  });

  it('logout mencabut server session dan menghapus cookie', async () => {
    const h = buildHarness();
    await seedUser(h);
    const loginRes = await loginRequest(h, 'budi', 'Rahasia123');
    const cookie = extractCookie(loginRes);
    const out = await h.app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    const setCookie = out.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('sarel_session=');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toMatch(/Max-Age=0/);
    // Session di server tidak lagi valid.
    const me = await h.app.request('/api/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });

  it('response body tidak pernah memuat raw session token', async () => {
    const h = buildHarness();
    await seedUser(h);
    const res = await loginRequest(h, 'budi', 'Rahasia123');
    const rawToken = extractCookie(res).split('=')[1] ?? '';
    const text = await res.text();
    expect(rawToken.length).toBeGreaterThan(0);
    expect(text.includes(rawToken)).toBe(false);
  });

  it('User ID dinormalisasi (trim) sebelum lookup', async () => {
    const h = buildHarness();
    await seedUser(h, { userId: 'budi' });
    const res = await loginRequest(h, '  budi  ', 'Rahasia123');
    expect(res.status).toBe(200);
  });

  it('response user tidak ditemukan dan password salah identik', async () => {
    const h = buildHarness();
    await seedUser(h, { userId: 'budi' });
    const notFound = await loginRequest(h, 'tidakada', 'apa-saja-123');
    const wrongPassword = await loginRequest(h, 'budi', 'PasswordSalah');
    expect(notFound.status).toBe(wrongPassword.status);
    const a = (await notFound.json()) as { code: string; message: string };
    const b = (await wrongPassword.json()) as { code: string; message: string };
    expect(a.code).toBe(b.code);
    expect(a.message).toBe(b.message);
  });
});

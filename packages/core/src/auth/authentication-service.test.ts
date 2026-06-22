import { describe, expect, it } from 'vitest';
import type { ClockPort } from '../ports/clock';
import type {
  NewSession,
  SessionRecord,
  SessionRepositoryPort,
} from '../ports/session-repository';
import type { UserRecord, UserRepositoryPort } from '../ports/user-repository';
import { AuthenticationService } from './authentication-service';
import { SessionService } from './session-service';

class MutableClock implements ClockPort {
  current: Date;
  constructor(initial: Date) {
    this.current = initial;
  }
  now(): Date {
    return this.current;
  }
}

class InMemorySessions implements SessionRepositoryPort {
  byHash = new Map<string, SessionRecord>();
  async create(session: NewSession): Promise<void> {
    this.byHash.set(session.tokenHash, { ...session, revokedAt: null });
  }
  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.byHash.get(tokenHash) ?? null;
  }
  async revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<void> {
    const s = this.byHash.get(tokenHash);
    if (s) {
      s.revokedAt = revokedAt;
    }
  }
}

class InMemoryUsers implements UserRepositoryPort {
  user: UserRecord = {
    id: 'user_1',
    userId: 'budi',
    fullName: 'Budi',
    passwordHash: 'x',
    status: 'ACTIVE',
  };
  async findByUserId(): Promise<UserRecord | null> {
    return this.user;
  }
  async findById(id: string): Promise<UserRecord | null> {
    return id === this.user.id ? this.user : null;
  }
  async findRoleCodes(): Promise<string[]> {
    return ['USER'];
  }
  async findPermissionCodes(): Promise<string[]> {
    return ['quiz.read'];
  }
}

async function setup(ttlSeconds = 3600) {
  const clock = new MutableClock(new Date('2026-06-21T00:00:00Z'));
  const sessions = new InMemorySessions();
  const users = new InMemoryUsers();
  const sessionService = new SessionService(clock, 'session-secret');
  const auth = new AuthenticationService(sessions, users, sessionService, clock);
  const issued = await sessionService.issue('user_1', ttlSeconds);
  await sessions.create({
    id: issued.id,
    userId: 'user_1',
    tokenHash: issued.tokenHash,
    expiresAt: issued.expiresAt,
    createdAt: issued.createdAt,
  });
  return { clock, sessions, users, auth, token: issued.token };
}

describe('AuthenticationService', () => {
  it('token valid menghasilkan principal', async () => {
    const { auth, token } = await setup();
    const principal = await auth.authenticate(token);
    expect(principal?.userId).toBe('budi');
    expect(principal?.roles).toEqual(['USER']);
  });

  it('token kosong ditolak', async () => {
    const { auth } = await setup();
    expect(await auth.authenticate('')).toBeNull();
  });

  it('token tidak dikenal ditolak', async () => {
    const { auth } = await setup();
    expect(await auth.authenticate('token-asing')).toBeNull();
  });

  it('session yang dicabut ditolak', async () => {
    const { auth, sessions, token, clock } = await setup();
    const tokenHash = [...sessions.byHash.keys()][0];
    await sessions.revokeByTokenHash(tokenHash, clock.now().toISOString());
    expect(await auth.authenticate(token)).toBeNull();
  });

  it('session yang kedaluwarsa ditolak', async () => {
    const { auth, token, clock } = await setup(1);
    clock.current = new Date('2026-06-21T00:01:00Z');
    expect(await auth.authenticate(token)).toBeNull();
  });
});

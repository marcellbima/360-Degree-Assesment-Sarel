import { describe, expect, it } from 'vitest';
import type { ClockPort } from '../ports/clock';
import { SessionService } from './session-service';
import { hmacSha256Hex } from './crypto-utils';

const fixedClock: ClockPort = {
  now: () => new Date('2026-06-21T00:00:00Z'),
};

const svc = new SessionService(fixedClock, 'session-secret-untuk-test');

describe('SessionService', () => {
  it('generateToken menghasilkan token acak yang berbeda', () => {
    const a = svc.generateToken();
    const b = svc.generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('hashToken memakai HMAC-SHA-256 dengan SESSION_SECRET', async () => {
    const token = 'token-contoh';
    const expected = await hmacSha256Hex('session-secret-untuk-test', token);
    expect(await svc.hashToken(token)).toBe(expected);
  });

  it('issue mengembalikan token mentah dan hash yang konsisten', async () => {
    const issued = await svc.issue('user_1', 3600);
    expect(issued.tokenHash).toBe(await svc.hashToken(issued.token));
    expect(issued.userId).toBe('user_1');
  });

  it('issue menghitung expiresAt berdasarkan ttl', async () => {
    const issued = await svc.issue('user_1', 3600);
    expect(issued.createdAt).toBe('2026-06-21T00:00:00.000Z');
    expect(issued.expiresAt).toBe('2026-06-21T01:00:00.000Z');
  });
});

import type { ClockPort } from '../ports/clock';
import { base64UrlEncode, hmacSha256Hex, randomBytes } from './crypto-utils';

const TOKEN_BYTES = 32;
const ID_BYTES = 16;

export interface IssuedSession {
  id: string;
  userId: string;
  token: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

// Session opaque server-side. Token asli hanya dikembalikan sekali (untuk cookie).
// Digest token memakai HMAC-SHA-256 dengan SESSION_SECRET; randomness token
// berasal dari CSPRNG, bukan dari secret.
export class SessionService {
  private readonly clock: ClockPort;
  private readonly secret: string;

  constructor(clock: ClockPort, secret: string) {
    this.clock = clock;
    this.secret = secret;
  }

  generateToken(): string {
    return base64UrlEncode(randomBytes(TOKEN_BYTES));
  }

  async hashToken(token: string): Promise<string> {
    return hmacSha256Hex(this.secret, token);
  }

  async issue(userId: string, ttlSeconds: number): Promise<IssuedSession> {
    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);
    const now = this.clock.now();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    return {
      id: base64UrlEncode(randomBytes(ID_BYTES)),
      userId,
      token,
      tokenHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}

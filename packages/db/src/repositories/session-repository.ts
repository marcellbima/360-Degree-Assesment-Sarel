import { and, count, eq, isNull } from 'drizzle-orm';
import type {
  NewSession,
  SessionAdminRepositoryPort,
  SessionRecord,
  SessionRepositoryPort,
} from '@sarel/core';
import type { Db } from '../client';
import { sessions } from '../schema/schema';

export class D1SessionRepository implements SessionRepositoryPort, SessionAdminRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async create(session: NewSession): Promise<void> {
    await this.db
      .insert(sessions)
      .values({
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      })
      .run();
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const row = await this.db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get();
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt ?? null,
    };
  }

  async revokeByTokenHash(tokenHash: string, revokedAt: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt }).where(eq(sessions.tokenHash, tokenHash)).run();
  }

  async revokeAllByUserId(userId: string, revokedAt: string): Promise<number> {
    const active = and(eq(sessions.userId, userId), isNull(sessions.revokedAt));
    const row = await this.db.select({ value: count() }).from(sessions).where(active).get();
    await this.db.update(sessions).set({ revokedAt }).where(active).run();
    return row?.value ?? 0;
  }
}

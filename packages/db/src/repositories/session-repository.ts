import { eq } from 'drizzle-orm';
import type { NewSession, SessionRecord, SessionRepositoryPort } from '@sarel/core';
import type { Db } from '../client';
import { sessions } from '../schema/schema';

export class D1SessionRepository implements SessionRepositoryPort {
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
}

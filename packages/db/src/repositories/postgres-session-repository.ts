import {
  and,
  eq,
  isNull,
} from 'drizzle-orm';
import type {
  NewSession,
  SessionAdminRepositoryPort,
  SessionRecord,
  SessionRepositoryPort,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { sessions } from '../schema/postgres-schema';

type SessionRow = typeof sessions.$inferSelect;

export class PostgresSessionRepository
  implements
    SessionRepositoryPort,
    SessionAdminRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private toRecord(
    row: SessionRow,
  ): SessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt ?? null,
    };
  }

  async create(
    session: NewSession,
  ): Promise<void> {
    await this.db.insert(sessions).values({
      id: session.id,
      userId: session.userId,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<SessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    return row ? this.toRecord(row) : null;
  }

  async revokeByTokenHash(
    tokenHash: string,
    revokedAt: string,
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  async revokeAllByUserId(
    userId: string,
    revokedAt: string,
  ): Promise<number> {
    const revokedRows = await this.db
      .update(sessions)
      .set({ revokedAt })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({
        id: sessions.id,
      });

    return revokedRows.length;
  }
}

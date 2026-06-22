import { and, count, eq, gte, type SQL } from 'drizzle-orm';
import type {
  ClearFailuresQuery,
  FailureQuery,
  LoginAttemptRepositoryPort,
  NewLoginAttempt,
} from '@sarel/core';
import type { Db } from '../client';
import { loginAttempts } from '../schema/schema';

export class D1LoginAttemptRepository implements LoginAttemptRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async record(attempt: NewLoginAttempt): Promise<void> {
    await this.db
      .insert(loginAttempts)
      .values({
        id: attempt.id,
        userId: attempt.userId,
        userIdInput: attempt.userIdInput,
        success: attempt.success ? 1 : 0,
        ipAddress: attempt.ipAddress,
        userAgent: attempt.userAgent,
        createdAt: attempt.createdAt,
      })
      .run();
  }

  async countRecentFailures(query: FailureQuery): Promise<number> {
    const conditions: SQL[] = [eq(loginAttempts.success, 0), gte(loginAttempts.createdAt, query.since)];
    if (query.userIdInput !== undefined) {
      conditions.push(eq(loginAttempts.userIdInput, query.userIdInput));
    }
    if (query.ipAddress !== undefined) {
      conditions.push(eq(loginAttempts.ipAddress, query.ipAddress));
    }
    const row = await this.db
      .select({ value: count() })
      .from(loginAttempts)
      .where(and(...conditions))
      .get();
    return row?.value ?? 0;
  }

  async clearFailures(query: ClearFailuresQuery): Promise<void> {
    const conditions: SQL[] = [eq(loginAttempts.success, 0)];
    if (query.userIdInput !== undefined) {
      conditions.push(eq(loginAttempts.userIdInput, query.userIdInput));
    }
    if (query.ipAddress !== undefined) {
      conditions.push(eq(loginAttempts.ipAddress, query.ipAddress));
    }
    await this.db
      .delete(loginAttempts)
      .where(and(...conditions))
      .run();
  }
}

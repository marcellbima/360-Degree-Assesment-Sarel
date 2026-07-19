import { eq, sql } from 'drizzle-orm';
import type { UserRecord, UserRepositoryPort } from '@sarel/core';
import type { Db } from '../client';
import { permissions, rolePermissions, roles, userRoles, users } from '../schema/schema';

type UserRow = typeof users.$inferSelect;

export class D1UserRepository implements UserRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  private toRecord(row: UserRow): UserRecord {
    return {
      id: row.id,
      userId: row.userId,
      fullName: row.fullName,
      passwordHash: row.passwordHash,
      status: row.status,
    };
  }

  async findByUserId(userId: string): Promise<UserRecord | null> {
    const row = await this.db.select().from(users).where(sql`lower(${users.userId}) = lower(${userId})`).get();
    return row ? this.toRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.db.select().from(users).where(eq(users.id, id)).get();
    return row ? this.toRecord(row) : null;
  }

  async findRoleCodes(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
      .all();
    return rows.map((r) => r.code);
  }

  async findPermissionCodes(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ code: permissions.code })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(userRoles.userId, userId))
      .all();
    return [...new Set(rows.map((r) => r.code))];
  }
}

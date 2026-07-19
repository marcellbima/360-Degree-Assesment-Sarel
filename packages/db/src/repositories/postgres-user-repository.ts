import { eq, sql } from 'drizzle-orm';
import type {
  UserRecord,
  UserRepositoryPort,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../schema/postgres-schema';

type UserRow = typeof users.$inferSelect;

export class PostgresUserRepository
  implements UserRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private toRecord(row: UserRow): UserRecord {
    return {
      id: row.id,
      userId: row.userId,
      fullName: row.fullName,
      passwordHash: row.passwordHash,
      status: row.status,
    };
  }

  async findByUserId(
    userId: string,
  ): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.userId}) = lower(${userId})`)
      .limit(1);

    return row ? this.toRecord(row) : null;
  }

  async findById(
    id: string,
  ): Promise<UserRecord | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return row ? this.toRecord(row) : null;
  }

  async findRoleCodes(
    userId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({
        code: roles.code,
      })
      .from(userRoles)
      .innerJoin(
        roles,
        eq(roles.id, userRoles.roleId),
      )
      .where(eq(userRoles.userId, userId));

    return rows.map((row) => row.code);
  }

  async findPermissionCodes(
    userId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({
        code: permissions.code,
      })
      .from(userRoles)
      .innerJoin(
        rolePermissions,
        eq(
          rolePermissions.roleId,
          userRoles.roleId,
        ),
      )
      .innerJoin(
        permissions,
        eq(
          permissions.id,
          rolePermissions.permissionId,
        ),
      )
      .where(eq(userRoles.userId, userId));

    return [
      ...new Set(rows.map((row) => row.code)),
    ];
  }
}

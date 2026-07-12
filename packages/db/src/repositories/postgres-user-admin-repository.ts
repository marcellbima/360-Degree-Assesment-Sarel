import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  generateId,
  type AdminScopeRow,
  type AdminUserRow,
  type NewUserRow,
  type ScopeFilter,
  type UserAdminRepositoryPort,
  type UserListFilter,
  type UserPatch,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  programParticipants,
  roles,
  userRoles,
  users,
} from '../schema/postgres-schema';
import {
  participantScopeMatch,
} from './postgres-scope-sql';

const USER_SELECT = {
  id: users.id,
  userId: users.userId,
  npk: users.npk,
  fullName: users.fullName,
  email: users.email,
  phone: users.phone,
  position: users.position,
  unit: users.unit,
  division: users.division,
  organizationId: users.organizationId,
  status: users.status,
  mustChangePassword:
    users.mustChangePassword,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export class PostgresUserAdminRepository
  implements UserAdminRepositoryPort
{
  constructor(
    private readonly db:
      PostgresDatabase,
  ) {}

  private scopeExists(
    scope: ScopeFilter,
  ): SQL | undefined {
    if (scope.kind === 'all') {
      return undefined;
    }

    const condition =
      participantScopeMatch(
        scope.rows,
      );

    return sql`
      EXISTS (
        SELECT 1
        FROM ${programParticipants}
        WHERE
          ${programParticipants.userId}
            = ${users.id}
          AND ${condition}
      )
    `;
  }

  async list(
    filter: UserListFilter,
  ): Promise<{
    items: AdminUserRow[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    const scopeCondition =
      this.scopeExists(
        filter.scope,
      );

    if (scopeCondition) {
      conditions.push(
        scopeCondition,
      );
    }

    if (filter.search) {
      const search =
        `%${filter.search}%`;

      const searchCondition =
        or(
          ilike(
            users.userId,
            search,
          ),
          ilike(
            users.fullName,
            search,
          ),
        );

      if (searchCondition) {
        conditions.push(
          searchCondition,
        );
      }
    }

    if (filter.status) {
      conditions.push(
        eq(
          users.status,
          filter.status,
        ),
      );
    }

    if (filter.roleCode) {
      conditions.push(
        sql`
          EXISTS (
            SELECT 1
            FROM ${userRoles}
            INNER JOIN ${roles}
              ON ${roles.id}
                = ${userRoles.roleId}
            WHERE
              ${userRoles.userId}
                = ${users.id}
              AND ${roles.code}
                = ${filter.roleCode}
          )
        `,
      );
    }

    const where =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const sortColumn = {
      userId: users.userId,
      fullName: users.fullName,
      createdAt: users.createdAt,
      status: users.status,
    }[filter.sortBy];

    const order =
      filter.sortDir === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);

    const [totalRow] =
      await this.db
        .select({
          value: count(),
        })
        .from(users)
        .where(where);

    const items =
      await this.db
        .select(USER_SELECT)
        .from(users)
        .where(where)
        .orderBy(order)
        .limit(filter.limit)
        .offset(filter.offset);

    return {
      items,
      total:
        totalRow?.value ?? 0,
    };
  }

  async findById(
    id: string,
  ): Promise<AdminUserRow | null> {
    const [row] =
      await this.db
        .select(USER_SELECT)
        .from(users)
        .where(
          eq(users.id, id),
        )
        .limit(1);

    return row ?? null;
  }

  async existsByUserId(
    userId: string,
  ): Promise<boolean> {
    const [row] =
      await this.db
        .select({
          id: users.id,
        })
        .from(users)
        .where(
          eq(
            users.userId,
            userId,
          ),
        )
        .limit(1);

    return row != null;
  }

  async insert(
    row: NewUserRow,
    roleIds: string[],
  ): Promise<void> {
    await this.db.transaction(
      async (tx) => {
        await tx
          .insert(users)
          .values({
            id: row.id,
            userId: row.userId,
            npk: row.npk,
            fullName: row.fullName,
            passwordHash:
              row.passwordHash,
            email: row.email,
            phone: row.phone,
            position: row.position,
            unit: row.unit,
            division: row.division,
            organizationId:
              row.organizationId,
            status: row.status,
            mustChangePassword:
              row.mustChangePassword,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdBy: row.createdBy,
          });

        if (
          roleIds.length > 0
        ) {
          await tx
            .insert(userRoles)
            .values(
              roleIds.map(
                (roleId) => ({
                  id: generateId(
                    'ur',
                  ),
                  userId: row.id,
                  roleId,
                }),
              ),
            );
        }
      },
    );
  }

  async update(
    id: string,
    patch: UserPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      fullName?: string;
      npk?: string | null;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
      unit?: string | null;
      division?: string | null;
      organizationId?:
        string | null;
    } = {
      updatedAt: patch.updatedAt,
    };

    if (
      patch.fullName !== undefined
    ) {
      values.fullName =
        patch.fullName;
    }

    if (patch.npk !== undefined) {
      values.npk = patch.npk;
    }

    if (
      patch.email !== undefined
    ) {
      values.email = patch.email;
    }

    if (
      patch.phone !== undefined
    ) {
      values.phone = patch.phone;
    }

    if (
      patch.position !== undefined
    ) {
      values.position =
        patch.position;
    }

    if (
      patch.unit !== undefined
    ) {
      values.unit = patch.unit;
    }

    if (
      patch.division !== undefined
    ) {
      values.division =
        patch.division;
    }

    if (
      patch.organizationId !==
      undefined
    ) {
      values.organizationId =
        patch.organizationId;
    }

    await this.db
      .update(users)
      .set(values)
      .where(
        eq(users.id, id),
      );
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        status,
        updatedAt,
      })
      .where(
        eq(users.id, id),
      );
  }

  async setPasswordHash(
    id: string,
    passwordHash: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({
        passwordHash,
        updatedAt,
      })
      .where(
        eq(users.id, id),
      );
  }

  async getRoleCodes(
    id: string,
  ): Promise<string[]> {
    const rows =
      await this.db
        .select({
          code: roles.code,
        })
        .from(userRoles)
        .innerJoin(
          roles,
          eq(
            roles.id,
            userRoles.roleId,
          ),
        )
        .where(
          eq(
            userRoles.userId,
            id,
          ),
        );

    return rows.map(
      (row) => row.code,
    );
  }

  async getRoleCodesForUsers(
    ids: string[],
  ): Promise<
    Record<string, string[]>
  > {
    if (ids.length === 0) {
      return {};
    }

    const rows =
      await this.db
        .select({
          userId:
            userRoles.userId,
          code: roles.code,
        })
        .from(userRoles)
        .innerJoin(
          roles,
          eq(
            roles.id,
            userRoles.roleId,
          ),
        )
        .where(
          inArray(
            userRoles.userId,
            ids,
          ),
        );

    const result:
      Record<string, string[]> =
        {};

    for (const row of rows) {
      (
        result[row.userId] ??= []
      ).push(row.code);
    }

    return result;
  }

  async replaceRoles(
    id: string,
    roleIds: string[],
  ): Promise<void> {
    await this.db.transaction(
      async (tx) => {
        await tx
          .delete(userRoles)
          .where(
            eq(
              userRoles.userId,
              id,
            ),
          );

        if (
          roleIds.length > 0
        ) {
          await tx
            .insert(userRoles)
            .values(
              roleIds.map(
                (roleId) => ({
                  id: generateId(
                    'ur',
                  ),
                  userId: id,
                  roleId,
                }),
              ),
            );
        }
      },
    );
  }

  async countActiveSuperadmins():
    Promise<number> {
    const [row] =
      await this.db
        .select({
          value: count(),
        })
        .from(users)
        .innerJoin(
          userRoles,
          eq(
            userRoles.userId,
            users.id,
          ),
        )
        .innerJoin(
          roles,
          eq(
            roles.id,
            userRoles.roleId,
          ),
        )
        .where(
          and(
            eq(
              users.status,
              'ACTIVE',
            ),
            eq(
              roles.code,
              'SUPERADMIN',
            ),
          ),
        );

    return row?.value ?? 0;
  }

  async isUserInScope(
    targetUserId: string,
    scopes: AdminScopeRow[],
  ): Promise<boolean> {
    const condition =
      participantScopeMatch(
        scopes,
      );

    const [row] =
      await this.db
        .select({
          value: count(),
        })
        .from(
          programParticipants,
        )
        .where(
          and(
            eq(
              programParticipants
                .userId,
              targetUserId,
            ),
            condition,
          ),
        );

    return (
      row?.value ?? 0
    ) > 0;
  }
}

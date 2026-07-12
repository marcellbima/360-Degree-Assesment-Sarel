import {
  eq,
} from 'drizzle-orm';
import type {
  AdminScopeRecord,
  AdminScopeRepositoryPort,
  NewAdminScope,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  adminScopes,
} from '../schema/postgres-schema';

export class PostgresAdminScopeRepository
  implements AdminScopeRepositoryPort
{
  constructor(
    private readonly db:
      PostgresDatabase,
  ) {}

  async findByAdminUserId(
    adminUserId: string,
  ): Promise<
    AdminScopeRecord[]
  > {
    const rows =
      await this.db
        .select()
        .from(adminScopes)
        .where(
          eq(
            adminScopes.adminUserId,
            adminUserId,
          ),
        );

    return rows.map(
      (row) => ({
        id: row.id,
        adminUserId:
          row.adminUserId,
        programId:
          row.programId ?? null,
        batchId:
          row.batchId ?? null,
        organizationId:
          row.organizationId ??
          null,
      }),
    );
  }

  async replaceForAdmin(
    adminUserId: string,
    scopes: NewAdminScope[],
  ): Promise<void> {
    await this.db.transaction(
      async (tx) => {
        await tx
          .delete(adminScopes)
          .where(
            eq(
              adminScopes
                .adminUserId,
              adminUserId,
            ),
          );

        if (
          scopes.length > 0
        ) {
          await tx
            .insert(adminScopes)
            .values(
              scopes.map(
                (scope) => ({
                  id: scope.id,
                  adminUserId:
                    scope.adminUserId,
                  programId:
                    scope.programId,
                  batchId:
                    scope.batchId,
                  organizationId:
                    scope.organizationId,
                  createdAt:
                    scope.createdAt,
                  createdBy:
                    scope.createdBy,
                }),
              ),
            );
        }
      },
    );
  }
}

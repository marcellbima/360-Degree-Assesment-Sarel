import { eq } from 'drizzle-orm';
import type { AdminScopeRecord, AdminScopeRepositoryPort } from '@sarel/core';
import type { Db } from '../client';
import { adminScopes } from '../schema/schema';

export class D1AdminScopeRepository implements AdminScopeRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async findByAdminUserId(adminUserId: string): Promise<AdminScopeRecord[]> {
    const rows = await this.db
      .select()
      .from(adminScopes)
      .where(eq(adminScopes.adminUserId, adminUserId))
      .all();
    return rows.map((row) => ({
      id: row.id,
      adminUserId: row.adminUserId,
      programId: row.programId ?? null,
      batchId: row.batchId ?? null,
      organizationId: row.organizationId ?? null,
    }));
  }
}

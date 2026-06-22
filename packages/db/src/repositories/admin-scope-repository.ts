import { eq } from 'drizzle-orm';
import type {
  AdminScopeRecord,
  AdminScopeRepositoryPort,
  NewAdminScope,
} from '@sarel/core';
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
    return rows.map((r) => ({
      id: r.id,
      adminUserId: r.adminUserId,
      programId: r.programId ?? null,
      batchId: r.batchId ?? null,
      organizationId: r.organizationId ?? null,
    }));
  }

  async replaceForAdmin(adminUserId: string, scopes: NewAdminScope[]): Promise<void> {
    const del = this.db.delete(adminScopes).where(eq(adminScopes.adminUserId, adminUserId));
    if (scopes.length === 0) {
      await del.run();
      return;
    }
    const insert = this.db.insert(adminScopes).values(
      scopes.map((s) => ({
        id: s.id,
        adminUserId: s.adminUserId,
        programId: s.programId,
        batchId: s.batchId,
        organizationId: s.organizationId,
        createdAt: s.createdAt,
        createdBy: s.createdBy,
      })),
    );
    // Atomic replace-all dalam satu batch (transaksi D1).
    await this.db.batch([del, insert]);
  }
}

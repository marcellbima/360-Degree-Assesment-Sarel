import { and, count, eq, like, type SQL } from 'drizzle-orm';
import type {
  NewOrganization,
  OrganizationListFilter,
  OrganizationPatch,
  OrganizationRepositoryPort,
  OrganizationRow,
} from '@sarel/core';
import type { Db } from '../client';
import { organizations } from '../schema/schema';
import { organizationScopeWhere } from './scope-sql';

export class D1OrganizationRepository implements OrganizationRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async list(
    filter: OrganizationListFilter,
  ): Promise<{ items: OrganizationRow[]; total: number }> {
    const conds: SQL[] = [];
    const scopeWhere = organizationScopeWhere(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.search) conds.push(like(organizations.name, `%${filter.search}%`));
    if (filter.status) conds.push(eq(organizations.status, filter.status));
    const where = conds.length ? and(...conds) : undefined;

    const totalRow = await this.db
      .select({ value: count() })
      .from(organizations)
      .where(where)
      .get();
    const items = await this.db
      .select()
      .from(organizations)
      .where(where)
      .orderBy(organizations.code)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items, total: totalRow?.value ?? 0 };
  }

  async findById(id: string): Promise<OrganizationRow | null> {
    return (await this.db.select().from(organizations).where(eq(organizations.id, id)).get()) ?? null;
  }

  async findByCode(code: string): Promise<OrganizationRow | null> {
    return (
      (await this.db.select().from(organizations).where(eq(organizations.code, code)).get()) ?? null
    );
  }

  async insert(row: NewOrganization): Promise<void> {
    await this.db.insert(organizations).values(row).run();
  }

  async update(id: string, patch: OrganizationPatch): Promise<void> {
    const set: Record<string, string> = { updatedAt: patch.updatedAt };
    if (patch.code !== undefined) set.code = patch.code;
    if (patch.name !== undefined) set.name = patch.name;
    await this.db.update(organizations).set(set).where(eq(organizations.id, id)).run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db
      .update(organizations)
      .set({ status, updatedAt })
      .where(eq(organizations.id, id))
      .run();
  }
}

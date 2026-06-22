import { and, count, eq, like, type SQL } from 'drizzle-orm';
import type {
  NewProgram,
  ProgramListFilter,
  ProgramPatch,
  ProgramRepositoryPort,
  ProgramRow,
} from '@sarel/core';
import type { Db } from '../client';
import { programs } from '../schema/schema';
import { programScopeWhere } from './scope-sql';

export class D1ProgramRepository implements ProgramRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async list(filter: ProgramListFilter): Promise<{ items: ProgramRow[]; total: number }> {
    const conds: SQL[] = [];
    const scopeWhere = programScopeWhere(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.search) conds.push(like(programs.name, `%${filter.search}%`));
    if (filter.status) conds.push(eq(programs.status, filter.status));
    if (filter.organizationId) conds.push(eq(programs.organizationId, filter.organizationId));
    const where = conds.length ? and(...conds) : undefined;

    const totalRow = await this.db.select({ value: count() }).from(programs).where(where).get();
    const items = await this.db
      .select()
      .from(programs)
      .where(where)
      .orderBy(programs.code)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items: items.map((r) => this.toRow(r)), total: totalRow?.value ?? 0 };
  }

  private toRow(r: typeof programs.$inferSelect): ProgramRow {
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      year: r.year,
      startDate: r.startDate,
      endDate: r.endDate,
      organizationId: r.organizationId ?? null,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findById(id: string): Promise<ProgramRow | null> {
    const r = await this.db.select().from(programs).where(eq(programs.id, id)).get();
    return r ? this.toRow(r) : null;
  }

  async findByCode(code: string): Promise<ProgramRow | null> {
    const r = await this.db.select().from(programs).where(eq(programs.code, code)).get();
    return r ? this.toRow(r) : null;
  }

  async insert(row: NewProgram): Promise<void> {
    await this.db.insert(programs).values(row).run();
  }

  async update(id: string, patch: ProgramPatch): Promise<void> {
    const set: Record<string, string | number | null> = { updatedAt: patch.updatedAt };
    if (patch.code !== undefined) set.code = patch.code;
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.year !== undefined) set.year = patch.year;
    if (patch.startDate !== undefined) set.startDate = patch.startDate;
    if (patch.endDate !== undefined) set.endDate = patch.endDate;
    if (patch.organizationId !== undefined) set.organizationId = patch.organizationId;
    await this.db.update(programs).set(set).where(eq(programs.id, id)).run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db.update(programs).set({ status, updatedAt }).where(eq(programs.id, id)).run();
  }
}

import { and, count, eq, like, type SQL } from 'drizzle-orm';
import type {
  BatchListFilter,
  BatchPatch,
  BatchRepositoryPort,
  BatchRow,
  NewBatch,
} from '@sarel/core';
import type { Db } from '../client';
import { batches, programs } from '../schema/schema';
import { batchScopeWhere } from './scope-sql';

const BATCH_COLUMNS = {
  id: batches.id,
  programId: batches.programId,
  code: batches.code,
  name: batches.name,
  description: batches.description,
  orderIndex: batches.orderIndex,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  createdAt: batches.createdAt,
  updatedAt: batches.updatedAt,
};

export class D1BatchRepository implements BatchRepositoryPort {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async list(filter: BatchListFilter): Promise<{ items: BatchRow[]; total: number }> {
    const conds: SQL[] = [];
    const scopeWhere = batchScopeWhere(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.search) conds.push(like(batches.name, `%${filter.search}%`));
    if (filter.status) conds.push(eq(batches.status, filter.status));
    if (filter.programId) conds.push(eq(batches.programId, filter.programId));
    const where = conds.length ? and(...conds) : undefined;

    const totalRow = await this.db
      .select({ value: count() })
      .from(batches)
      .leftJoin(programs, eq(programs.id, batches.programId))
      .where(where)
      .get();
    const items = await this.db
      .select(BATCH_COLUMNS)
      .from(batches)
      .leftJoin(programs, eq(programs.id, batches.programId))
      .where(where)
      .orderBy(batches.orderIndex)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items, total: totalRow?.value ?? 0 };
  }

  async findById(id: string): Promise<BatchRow | null> {
    return (await this.db.select(BATCH_COLUMNS).from(batches).where(eq(batches.id, id)).get()) ?? null;
  }

  async findByProgramAndCode(programId: string, code: string): Promise<BatchRow | null> {
    return (
      (await this.db
        .select(BATCH_COLUMNS)
        .from(batches)
        .where(and(eq(batches.programId, programId), eq(batches.code, code)))
        .get()) ?? null
    );
  }

  async insert(row: NewBatch): Promise<void> {
    await this.db.insert(batches).values(row).run();
  }

  async update(id: string, patch: BatchPatch): Promise<void> {
    const set: Record<string, string | number | null> = { updatedAt: patch.updatedAt };
    if (patch.code !== undefined) set.code = patch.code;
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.description !== undefined) set.description = patch.description;
    if (patch.orderIndex !== undefined) set.orderIndex = patch.orderIndex;
    if (patch.startDate !== undefined) set.startDate = patch.startDate;
    if (patch.endDate !== undefined) set.endDate = patch.endDate;
    await this.db.update(batches).set(set).where(eq(batches.id, id)).run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db.update(batches).set({ status, updatedAt }).where(eq(batches.id, id)).run();
  }
}

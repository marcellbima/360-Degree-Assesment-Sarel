import {
  and,
  count,
  eq,
  ilike,
  type SQL,
} from 'drizzle-orm';
import type {
  BatchListFilter,
  BatchPatch,
  BatchRepositoryPort,
  BatchRow,
  NewBatch,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  batches,
  programs,
} from '../schema/postgres-schema';
import {
  batchScopeWhere,
} from './postgres-scope-sql';

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

export class PostgresBatchRepository
  implements BatchRepositoryPort
{
  constructor(
    private readonly db:
      PostgresDatabase,
  ) {}

  async list(
    filter: BatchListFilter,
  ): Promise<{
    items: BatchRow[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    const scopeCondition =
      batchScopeWhere(
        filter.scope,
      );

    if (scopeCondition) {
      conditions.push(
        scopeCondition,
      );
    }

    if (filter.search) {
      conditions.push(
        ilike(
          batches.name,
          `%${filter.search}%`,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(
          batches.status,
          filter.status,
        ),
      );
    }

    if (filter.programId) {
      conditions.push(
        eq(
          batches.programId,
          filter.programId,
        ),
      );
    }

    const where =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const [totalRow] =
      await this.db
        .select({
          value: count(),
        })
        .from(batches)
        .leftJoin(
          programs,
          eq(
            programs.id,
            batches.programId,
          ),
        )
        .where(where);

    const items =
      await this.db
        .select(BATCH_COLUMNS)
        .from(batches)
        .leftJoin(
          programs,
          eq(
            programs.id,
            batches.programId,
          ),
        )
        .where(where)
        .orderBy(
          batches.orderIndex,
          batches.code,
        )
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
  ): Promise<BatchRow | null> {
    const [row] =
      await this.db
        .select(BATCH_COLUMNS)
        .from(batches)
        .where(
          eq(batches.id, id),
        )
        .limit(1);

    return row ?? null;
  }

  async findByProgramAndCode(
    programId: string,
    code: string,
  ): Promise<BatchRow | null> {
    const [row] =
      await this.db
        .select(BATCH_COLUMNS)
        .from(batches)
        .where(
          and(
            eq(
              batches.programId,
              programId,
            ),
            eq(
              batches.code,
              code,
            ),
          ),
        )
        .limit(1);

    return row ?? null;
  }

  async insert(
    row: NewBatch,
  ): Promise<void> {
    await this.db
      .insert(batches)
      .values(row);
  }

  async update(
    id: string,
    patch: BatchPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      code?: string;
      name?: string;
      description?: string | null;
      orderIndex?: number;
      startDate?: string | null;
      endDate?: string | null;
    } = {
      updatedAt: patch.updatedAt,
    };

    if (patch.code !== undefined) {
      values.code = patch.code;
    }

    if (patch.name !== undefined) {
      values.name = patch.name;
    }

    if (
      patch.description !== undefined
    ) {
      values.description =
        patch.description;
    }

    if (
      patch.orderIndex !== undefined
    ) {
      values.orderIndex =
        patch.orderIndex;
    }

    if (
      patch.startDate !== undefined
    ) {
      values.startDate =
        patch.startDate;
    }

    if (
      patch.endDate !== undefined
    ) {
      values.endDate =
        patch.endDate;
    }

    await this.db
      .update(batches)
      .set(values)
      .where(
        eq(batches.id, id),
      );
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(batches)
      .set({
        status,
        updatedAt,
      })
      .where(
        eq(batches.id, id),
      );
  }
}

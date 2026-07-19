import {
  and,
  count,
  eq,
  ilike,
  type SQL,
} from 'drizzle-orm';
import type {
  NewProgram,
  ProgramListFilter,
  ProgramPatch,
  ProgramRepositoryPort,
  ProgramRow,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { programs } from '../schema/postgres-schema';
import { programScopeWhere } from './postgres-scope-sql';

type ProgramDatabaseRow =
  typeof programs.$inferSelect;

export class PostgresProgramRepository
  implements ProgramRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private toRow(
    row: ProgramDatabaseRow,
  ): ProgramRow {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      year: row.year,
      startDate: row.startDate,
      endDate: row.endDate,
      organizationId:
        row.organizationId ?? null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(
    filter: ProgramListFilter,
  ): Promise<{
    items: ProgramRow[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    const scopeCondition =
      programScopeWhere(filter.scope);

    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    if (filter.search) {
      conditions.push(
        ilike(
          programs.name,
          `%${filter.search}%`,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(programs.status, filter.status),
      );
    }

    if (filter.organizationId) {
      conditions.push(
        eq(
          programs.organizationId,
          filter.organizationId,
        ),
      );
    }

    const where =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const [totalRow] = await this.db
      .select({
        value: count(),
      })
      .from(programs)
      .where(where);

    const rows = await this.db
      .select()
      .from(programs)
      .where(where)
      .orderBy(programs.code)
      .limit(filter.limit)
      .offset(filter.offset);

    return {
      items: rows.map((row) =>
        this.toRow(row),
      ),
      total: totalRow?.value ?? 0,
    };
  }

  async findById(
    id: string,
  ): Promise<ProgramRow | null> {
    const [row] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async findByCode(
    code: string,
  ): Promise<ProgramRow | null> {
    const [row] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.code, code))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async insert(
    row: NewProgram,
  ): Promise<void> {
    await this.db
      .insert(programs)
      .values(row);
  }

  async update(
    id: string,
    patch: ProgramPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      code?: string;
      name?: string;
      description?: string | null;
      year?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      organizationId?: string | null;
    } = {
      updatedAt: patch.updatedAt,
    };

    if (patch.code !== undefined) {
      values.code = patch.code;
    }

    if (patch.name !== undefined) {
      values.name = patch.name;
    }

    if (patch.description !== undefined) {
      values.description = patch.description;
    }

    if (patch.year !== undefined) {
      values.year = patch.year;
    }

    if (patch.startDate !== undefined) {
      values.startDate = patch.startDate;
    }

    if (patch.endDate !== undefined) {
      values.endDate = patch.endDate;
    }

    if (patch.organizationId !== undefined) {
      values.organizationId =
        patch.organizationId;
    }

    await this.db
      .update(programs)
      .set(values)
      .where(eq(programs.id, id));
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(programs)
      .set({
        status,
        updatedAt,
      })
      .where(eq(programs.id, id));
  }
}

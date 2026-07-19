import {
  and,
  count,
  eq,
  ilike,
  type SQL,
} from 'drizzle-orm';
import type {
  NewOrganization,
  OrganizationListFilter,
  OrganizationPatch,
  OrganizationRepositoryPort,
  OrganizationRow,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import { organizations } from '../schema/postgres-schema';
import { organizationScopeWhere } from './postgres-scope-sql';

export class PostgresOrganizationRepository
  implements OrganizationRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async list(
    filter: OrganizationListFilter,
  ): Promise<{
    items: OrganizationRow[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    const scopeCondition =
      organizationScopeWhere(filter.scope);

    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    if (filter.search) {
      conditions.push(
        ilike(
          organizations.name,
          `%${filter.search}%`,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(
          organizations.status,
          filter.status,
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
      .from(organizations)
      .where(where);

    const items = await this.db
      .select()
      .from(organizations)
      .where(where)
      .orderBy(organizations.code)
      .limit(filter.limit)
      .offset(filter.offset);

    return {
      items,
      total: totalRow?.value ?? 0,
    };
  }

  async findById(
    id: string,
  ): Promise<OrganizationRow | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    code: string,
  ): Promise<OrganizationRow | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.code, code))
      .limit(1);

    return row ?? null;
  }

  async insert(
    row: NewOrganization,
  ): Promise<void> {
    await this.db
      .insert(organizations)
      .values(row);
  }

  async update(
    id: string,
    patch: OrganizationPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      code?: string;
      name?: string;
    } = {
      updatedAt: patch.updatedAt,
    };

    if (patch.code !== undefined) {
      values.code = patch.code;
    }

    if (patch.name !== undefined) {
      values.name = patch.name;
    }

    await this.db
      .update(organizations)
      .set(values)
      .where(eq(organizations.id, id));
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(organizations)
      .set({
        status,
        updatedAt,
      })
      .where(eq(organizations.id, id));
  }
}

import {
  and,
  eq,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { ScopeFilter } from '@sarel/core';

import {
  organizations,
  programs,
} from '../schema/postgres-schema';

const ALWAYS_FALSE: SQL = sql`false`;

export function organizationScopeWhere(
  scope: ScopeFilter,
): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }

  const organizationIds = scope.rows
    .filter(
      (row) =>
        !row.programId &&
        !row.batchId &&
        row.organizationId,
    )
    .map(
      (row) => row.organizationId as string,
    );

  if (organizationIds.length === 0) {
    return ALWAYS_FALSE;
  }

  return inArray(
    organizations.id,
    organizationIds,
  );
}

export function programScopeWhere(
  scope: ScopeFilter,
): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }

  const scopeRows = scope.rows.filter(
    (row) =>
      !row.batchId &&
      (row.programId || row.organizationId),
  );

  if (scopeRows.length === 0) {
    return ALWAYS_FALSE;
  }

  const conditions = scopeRows.map((row) => {
    const matches: SQL[] = [];

    if (row.programId) {
      matches.push(
        eq(programs.id, row.programId),
      );
    }

    if (row.organizationId) {
      matches.push(
        eq(
          programs.organizationId,
          row.organizationId,
        ),
      );
    }

    return and(...matches) ?? ALWAYS_FALSE;
  });

  return or(...conditions) ?? ALWAYS_FALSE;
}

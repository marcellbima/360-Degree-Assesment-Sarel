import {
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { ScopeFilter } from '@sarel/core';

import { organizations } from '../schema/postgres-schema';

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

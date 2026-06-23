import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { AdminScopeRow, ScopeFilter } from '@sarel/core';
import { batches, organizations, programParticipants, programs } from '../schema/schema';

// Membangun kondisi WHERE scope di SQL. SUPERADMIN (all) => undefined (tanpa filter).
// ADMIN tanpa baris yang cocok => 0 = 1 (tidak melihat apa pun, tanpa fallback global).

const ALWAYS_FALSE: SQL = sql`0 = 1`;

export function organizationScopeWhere(scope: ScopeFilter): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }
  // Hanya baris organization-saja yang memberi visibilitas organization.
  const ids = scope.rows
    .filter((r) => !r.programId && !r.batchId && r.organizationId)
    .map((r) => r.organizationId as string);
  if (ids.length === 0) {
    return ALWAYS_FALSE;
  }
  return inArray(organizations.id, ids);
}

export function programScopeWhere(scope: ScopeFilter): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }
  const rows = scope.rows.filter((r) => !r.batchId && (r.programId || r.organizationId));
  if (rows.length === 0) {
    return ALWAYS_FALSE;
  }
  const ors = rows.map((r) => {
    const conds: SQL[] = [];
    if (r.programId) conds.push(eq(programs.id, r.programId));
    if (r.organizationId) conds.push(eq(programs.organizationId, r.organizationId));
    return and(...conds) ?? ALWAYS_FALSE;
  });
  return or(...ors) ?? ALWAYS_FALSE;
}

// Memerlukan join programs (alias default) pada query batch untuk organization check.
export function batchScopeWhere(scope: ScopeFilter): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }
  const rows = scope.rows.filter((r) => r.programId || r.batchId || r.organizationId);
  if (rows.length === 0) {
    return ALWAYS_FALSE;
  }
  const ors = rows.map((r) => {
    const conds: SQL[] = [];
    if (r.programId) conds.push(eq(batches.programId, r.programId));
    if (r.batchId) conds.push(eq(batches.id, r.batchId));
    if (r.organizationId) conds.push(eq(programs.organizationId, r.organizationId));
    return and(...conds) ?? ALWAYS_FALSE;
  });
  return or(...ors) ?? ALWAYS_FALSE;
}

// Kondisi WHERE scope untuk query yang berbasis program_participants.
export function participantScopeWhere(scope: ScopeFilter): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }
  return participantScopeMatch(scope.rows);
}

// Kecocokan scope terhadap baris program_participants (untuk visibilitas user).
export function participantScopeMatch(rows: AdminScopeRow[]): SQL {
  const usable = rows.filter((r) => r.programId || r.batchId || r.organizationId);
  if (usable.length === 0) {
    return ALWAYS_FALSE;
  }
  const ors = usable.map((r) => {
    const conds: SQL[] = [];
    if (r.programId) conds.push(eq(programParticipants.programId, r.programId));
    if (r.batchId) conds.push(eq(programParticipants.batchId, r.batchId));
    if (r.organizationId) conds.push(eq(programParticipants.organizationId, r.organizationId));
    return and(...conds) ?? ALWAYS_FALSE;
  });
  return or(...ors) ?? ALWAYS_FALSE;
}

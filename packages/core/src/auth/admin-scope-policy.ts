import { SUPERADMIN_ROLE } from './rbac';

// Aturan admin scope sesuai docs/ARCHITECTURE_DRAFT.md bagian 4.
// Seluruh pembatasan dilakukan di backend.

export interface AdminScopeRow {
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
}

export interface ScopeTarget {
  programId: string | null;
  batchId: string | null;
  organizationId: string | null;
}

export class ScopeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeValidationError';
  }
}

// Validasi satu baris scope sebelum disimpan.
// options.batchProgramId: program asal batch (jika batchId diisi) untuk cek konsistensi.
export function assertValidScopeRow(
  row: AdminScopeRow,
  options?: { batchProgramId?: string | null },
): void {
  if (!row.programId && !row.batchId && !row.organizationId) {
    throw new ScopeValidationError(
      'Minimal satu dari program, batch, atau organization wajib diisi.',
    );
  }
  if (
    row.programId &&
    row.batchId &&
    options?.batchProgramId != null &&
    options.batchProgramId !== row.programId
  ) {
    throw new ScopeValidationError('Batch tidak berasal dari program yang ditentukan.');
  }
}

// Kolom yang terisi pada satu baris digabung dengan AND.
function rowMatches(row: AdminScopeRow, target: ScopeTarget): boolean {
  if (row.programId && row.programId !== target.programId) {
    return false;
  }
  if (row.batchId && row.batchId !== target.batchId) {
    return false;
  }
  if (row.organizationId && row.organizationId !== target.organizationId) {
    return false;
  }
  return true;
}

// SUPERADMIN tidak dibatasi. ADMIN terlihat jika cocok dengan minimal satu baris (OR).
export function isWithinScope(
  roles: string[],
  scopes: AdminScopeRow[],
  target: ScopeTarget,
): boolean {
  if (roles.includes(SUPERADMIN_ROLE)) {
    return true;
  }
  if (scopes.length === 0) {
    return false;
  }
  return scopes.some((row) => rowMatches(row, target));
}

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

// Konsistensi referensi yang dapat diketahui dari relasi database.
// Nilai undefined berarti tidak diperiksa; null berarti referensi tidak ber-organisasi.
export interface ScopeConsistency {
  batchProgramId?: string | null; // program asal batch (cek batch berasal dari program)
  programOrganizationId?: string | null; // organisasi asal program (cek program berasal dari organization)
  batchOrganizationId?: string | null; // organisasi asal batch via program (cek batch konsisten dengan organization)
}

// Validasi satu baris scope sebelum disimpan.
export function assertValidScopeRow(row: AdminScopeRow, consistency?: ScopeConsistency): void {
  if (!row.programId && !row.batchId && !row.organizationId) {
    throw new ScopeValidationError(
      'Minimal satu dari program, batch, atau organization wajib diisi.',
    );
  }
  if (
    row.programId &&
    row.batchId &&
    consistency?.batchProgramId != null &&
    consistency.batchProgramId !== row.programId
  ) {
    throw new ScopeValidationError('Batch tidak berasal dari program yang ditentukan.');
  }
  if (
    row.programId &&
    row.organizationId &&
    consistency?.programOrganizationId != null &&
    consistency.programOrganizationId !== row.organizationId
  ) {
    throw new ScopeValidationError('Program tidak berasal dari organization yang ditentukan.');
  }
  if (
    row.batchId &&
    row.organizationId &&
    consistency?.batchOrganizationId != null &&
    consistency.batchOrganizationId !== row.organizationId
  ) {
    throw new ScopeValidationError('Batch tidak konsisten dengan organization yang ditentukan.');
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

// Kunci normalisasi untuk mendeteksi scope duplikat secara deterministik.
export function scopeKey(row: AdminScopeRow): string {
  return [row.organizationId ?? '', row.programId ?? '', row.batchId ?? ''].join('|');
}

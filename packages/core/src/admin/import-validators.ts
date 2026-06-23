import type { ImportParticipantRef, ImportUserRef } from '../ports/import-lookup-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import type { ScopeFilter } from './types';

function outOfScope(scope: ScopeFilter, target: {
  programId: string;
  batchId: string | null;
  organizationId: string | null;
}): boolean {
  return scope.kind === 'scoped' && !isWithinScope([], scope.rows, target);
}

export interface ClassifiedRow {
  rowNumber: number;
  status: 'VALID' | 'SKIPPED' | 'ERROR';
  message: string | null;
  normalized: Record<string, string> | null;
}

export interface ParticipantRowInput {
  rowNumber: number;
  userId: string;
  batchCode: string;
}
export interface ParticipantLookups {
  usersByCode: Map<string, ImportUserRef>;
  batchIdByCode: Map<string, string>;
  activeParticipantUserIds: Set<string>;
  scope: ScopeFilter;
  programId: string;
  programOrganizationId: string | null;
}

// Klasifikasi deterministik baris participant import. Tidak menulis data.
export function classifyParticipantRows(
  rows: ParticipantRowInput[],
  lookups: ParticipantLookups,
): ClassifiedRow[] {
  const seenUsers = new Set<string>();
  return rows.map((row): ClassifiedRow => {
    const userCode = row.userId.trim();
    const batchCode = row.batchCode.trim();
    if (!userCode || !batchCode) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Data baris tidak lengkap.', normalized: null };
    }
    const user = lookups.usersByCode.get(userCode);
    if (!user) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'User tidak ditemukan.', normalized: null };
    }
    const batchId = lookups.batchIdByCode.get(batchCode);
    if (!batchId) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Batch tidak ditemukan pada program.', normalized: null };
    }
    if (
      outOfScope(lookups.scope, {
        programId: lookups.programId,
        batchId,
        organizationId: lookups.programOrganizationId,
      })
    ) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Batch berada di luar scope administratif Anda.', normalized: null };
    }
    if (seenUsers.has(user.id)) {
      return { rowNumber: row.rowNumber, status: 'SKIPPED', message: 'Duplikat dalam file.', normalized: null };
    }
    seenUsers.add(user.id);
    if (lookups.activeParticipantUserIds.has(user.id)) {
      return { rowNumber: row.rowNumber, status: 'SKIPPED', message: 'Sudah menjadi participant aktif.', normalized: null };
    }
    return {
      rowNumber: row.rowNumber,
      status: 'VALID',
      message: null,
      normalized: { userDbId: user.id, batchId },
    };
  });
}

export interface EvaluatorRowInput {
  rowNumber: number;
  subjectUserId: string;
  evaluatorUserId: string;
  assessmentType: string;
}
export interface EvaluatorLookups {
  participantsByUserCode: Map<string, ImportParticipantRef>;
  activeRelationKeys: Set<string>;
  typeIdByCode: Map<string, string>;
  scope: ScopeFilter;
  programId: string;
}

const EVALUATOR_TYPES = new Set(['SUPERIOR', 'PEER', 'SUBORDINATE']);

export function classifyEvaluatorRows(
  rows: EvaluatorRowInput[],
  lookups: EvaluatorLookups,
): ClassifiedRow[] {
  const seen = new Set<string>();
  return rows.map((row): ClassifiedRow => {
    const subjectCode = row.subjectUserId.trim();
    const evaluatorCode = row.evaluatorUserId.trim();
    const type = row.assessmentType.trim().toUpperCase();
    if (!subjectCode || !evaluatorCode || !type) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Data baris tidak lengkap.', normalized: null };
    }
    if (!EVALUATOR_TYPES.has(type)) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Assessment type tidak didukung (SELF tidak diperbolehkan).', normalized: null };
    }
    if (subjectCode === evaluatorCode) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Subject dan evaluator tidak boleh sama.', normalized: null };
    }
    const subject = lookups.participantsByUserCode.get(subjectCode);
    if (!subject) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Subject bukan participant aktif pada program.', normalized: null };
    }
    const evaluator = lookups.participantsByUserCode.get(evaluatorCode);
    if (!evaluator) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Evaluator bukan participant aktif pada program.', normalized: null };
    }
    if (subject.userId === evaluator.userId) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Evaluator tidak boleh menilai dirinya sendiri.', normalized: null };
    }
    const subjOut = outOfScope(lookups.scope, {
      programId: lookups.programId,
      batchId: subject.batchId,
      organizationId: subject.organizationId,
    });
    const evalOut = outOfScope(lookups.scope, {
      programId: lookups.programId,
      batchId: evaluator.batchId,
      organizationId: evaluator.organizationId,
    });
    if (subjOut || evalOut) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Subject atau evaluator di luar scope administratif Anda.', normalized: null };
    }
    const typeId = lookups.typeIdByCode.get(type);
    if (!typeId) {
      return { rowNumber: row.rowNumber, status: 'ERROR', message: 'Assessment type tidak dikenal.', normalized: null };
    }
    const key = `${subject.participantId}|${evaluator.userId}|${typeId}`;
    if (seen.has(key)) {
      return { rowNumber: row.rowNumber, status: 'SKIPPED', message: 'Duplikat dalam file.', normalized: null };
    }
    seen.add(key);
    if (lookups.activeRelationKeys.has(key)) {
      return { rowNumber: row.rowNumber, status: 'SKIPPED', message: 'Relation sudah aktif.', normalized: null };
    }
    return {
      rowNumber: row.rowNumber,
      status: 'VALID',
      message: null,
      normalized: {
        subjectParticipantId: subject.participantId,
        evaluatorUserId: evaluator.userId,
        assessmentTypeId: typeId,
      },
    };
  });
}

export function summarize(rows: ClassifiedRow[]): {
  total: number;
  valid: number;
  skipped: number;
  error: number;
} {
  let valid = 0;
  let skipped = 0;
  let error = 0;
  for (const r of rows) {
    if (r.status === 'VALID') valid += 1;
    else if (r.status === 'SKIPPED') skipped += 1;
    else error += 1;
  }
  return { total: rows.length, valid, skipped, error };
}

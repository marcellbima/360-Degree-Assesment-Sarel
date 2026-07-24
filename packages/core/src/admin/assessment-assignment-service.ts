import { AppError, MASTER_STATUS_ACTIVE } from '@sarel/shared';

import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type {
  AssessmentAssignmentGroupCreateResult,
  AssessmentAssignmentRepositoryPort,
  AssessmentAssignmentSelection,
  AssessmentAssignmentTypeCode,
  InitialAssessmentAssignmentStatus,
} from '../ports/assessment-assignment-repository';
import type {
  AssessmentTypeRepositoryPort,
  AssessmentTypeRow,
} from '../ports/assessment-type-repository';
import type { ClockPort } from '../ports/clock';
import type { ProgramRepositoryPort, ProgramRow } from '../ports/program-repository';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { loadScopeFilter } from './scope-util';
import type { AdminContext, ScopeFilter } from './types';

export interface CreateAssessmentAssignmentInput {
  name: string;
  publicFormVersionId: string;
  assessmentType: AssessmentAssignmentTypeCode;
  selection: AssessmentAssignmentSelection;
  availableFrom?: string | null;
  dueAt?: string | null;
}

export interface AssessmentAssignmentGroupView extends AssessmentAssignmentGroupCreateResult {
  programId: string;
  publicFormId: string;
  publicFormVersionId: string;
  versionNumber: number;
  assessmentType: AssessmentAssignmentTypeCode;
  name: string;
  selection: AssessmentAssignmentSelection;
  groupStatus: 'ACTIVE';
  assignmentStatus: InitialAssessmentAssignmentStatus;
  availableFrom: string | null;
  dueAt: string | null;
  createdAt: string;
}

export interface AssessmentAssignmentDeps {
  assignments: AssessmentAssignmentRepositoryPort;
  programs: ProgramRepositoryPort;
  assessmentTypes: AssessmentTypeRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

function normalizeDateTime(value: string | null | undefined, label: string): string | null {
  const normalized = value?.trim() ?? '';

  if (normalized.length === 0) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    throw new AppError('VALIDATION_ERROR', `${label} tidak valid.`, 400);
  }

  return new Date(timestamp).toISOString();
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeSelection(
  selection: AssessmentAssignmentSelection,
): AssessmentAssignmentSelection {
  if (selection.mode === 'ALL_ACTIVE') {
    return {
      mode: 'ALL_ACTIVE',
    };
  }

  if (selection.mode === 'BATCHES') {
    const batchIds = uniqueIds(selection.batchIds);

    if (batchIds.length === 0 && !selection.includeWithoutBatch) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Pilih minimal satu batch atau peserta tanpa batch.',
        400,
      );
    }

    return {
      mode: 'BATCHES',
      batchIds,
      includeWithoutBatch: selection.includeWithoutBatch,
    };
  }

  const participantIds = uniqueIds(selection.participantIds);

  if (participantIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Pilih minimal satu peserta.', 400);
  }

  return {
    mode: 'PARTICIPANTS',
    participantIds,
  };
}

function canAccessProgram(scope: ScopeFilter, program: ProgramRow): boolean {
  if (scope.kind === 'all') {
    return true;
  }

  return scope.rows.some((row) => {
    const programMatches = row.programId === program.id || row.programId === null;

    const organizationMatches =
      row.organizationId === program.organizationId || row.organizationId === null;

    const hasProgramBoundary = row.programId === program.id;

    const hasOrganizationBoundary =
      program.organizationId !== null && row.organizationId === program.organizationId;

    return programMatches && organizationMatches && (hasProgramBoundary || hasOrganizationBoundary);
  });
}

function validateAssessmentType(type: AssessmentTypeRow, code: AssessmentAssignmentTypeCode): void {
  const expectsSelf = code === 'SELF';

  if (type.isSelf !== expectsSelf) {
    throw new AppError('INTERNAL_ERROR', 'Konfigurasi assessment type tidak konsisten.', 500);
  }
}

export class AssessmentAssignmentService {
  constructor(private readonly deps: AssessmentAssignmentDeps) {}

  async create(
    programId: string,
    input: CreateAssessmentAssignmentInput,
    context: AdminContext,
  ): Promise<AssessmentAssignmentGroupView> {
    const normalizedProgramId = programId.trim();

    const name = input.name.trim();

    const publicFormVersionId = input.publicFormVersionId.trim();

    if (normalizedProgramId.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Program wajib dipilih.', 400);
    }

    if (name.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Nama penugasan wajib diisi.', 400);
    }

    if (name.length > 160) {
      throw new AppError('VALIDATION_ERROR', 'Nama penugasan maksimal 160 karakter.', 400);
    }

    if (publicFormVersionId.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Versi formulir wajib dipilih.', 400);
    }

    const availableFrom = normalizeDateTime(input.availableFrom, 'Waktu mulai');

    const dueAt = normalizeDateTime(input.dueAt, 'Batas waktu');

    if (availableFrom && dueAt && Date.parse(dueAt) <= Date.parse(availableFrom)) {
      throw new AppError('VALIDATION_ERROR', 'Batas waktu harus setelah waktu mulai.', 400);
    }

    const selection = normalizeSelection(input.selection);

    const [program, formVersion, assessmentTypes, scope] = await Promise.all([
      this.deps.programs.findById(normalizedProgramId),
      this.deps.assignments.findPublicFormVersionById(publicFormVersionId),
      this.deps.assessmentTypes.list(),
      loadScopeFilter(this.deps.scopes, context),
    ]);

    if (!program) {
      throw new AppError('NOT_FOUND', 'Program tidak ditemukan.', 404);
    }

    if (program.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError(
        'CONFLICT',
        'Program yang tidak aktif tidak dapat menerima penugasan baru.',
        409,
      );
    }

    if (!canAccessProgram(scope, program)) {
      throw new AppError('FORBIDDEN', 'Program berada di luar scope administratif Anda.', 403);
    }

    if (!formVersion) {
      throw new AppError('NOT_FOUND', 'Versi formulir tidak ditemukan.', 404);
    }

    const assessmentType = assessmentTypes.find((type) => type.code === input.assessmentType);

    if (!assessmentType) {
      throw new AppError('NOT_FOUND', 'Assessment type tidak ditemukan.', 404);
    }

    validateAssessmentType(assessmentType, input.assessmentType);

    const nowDate = this.deps.clock.now();

    const now = nowDate.toISOString();

    const assignmentStatus: InitialAssessmentAssignmentStatus =
      availableFrom && Date.parse(availableFrom) > nowDate.getTime() ? 'ASSIGNED' : 'AVAILABLE';

    const groupId = generateId('asggrp');

    const result = await this.deps.assignments.createGroup({
      group: {
        id: groupId,
        programId: normalizedProgramId,
        publicFormVersionId,
        assessmentTypeId: assessmentType.id,
        name,
        selectionMode: selection.mode,
        status: 'ACTIVE',
        availableFrom,
        dueAt,
        createdBy: context.actor.id,
        createdAt: now,
        updatedAt: now,
      },
      selection,
      assessmentTypeCode: input.assessmentType,
      isSelf: assessmentType.isSelf,
      assignmentStatus,
      scope,
    });

    if (!result || result.createdAssignmentCount === 0) {
      throw new AppError(
        'CONFLICT',
        'Tidak ada penugasan baru yang dapat dibuat dari pilihan tersebut.',
        409,
      );
    }

    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.ASSESSMENT_ASSIGNMENT_GROUP_CREATED,
      context,
      'assessment_assignment_group',
      result.groupId,
      [
        `Type ${input.assessmentType}.`,
        `Dibuat ${result.createdAssignmentCount}.`,
        `Duplikat ${result.skippedDuplicateCount}.`,
        `Tanpa relasi ${result.skippedNoRelationCount}.`,
      ].join(' '),
    );

    return {
      ...result,
      programId: normalizedProgramId,
      publicFormId: formVersion.publicFormId,
      publicFormVersionId,
      versionNumber: formVersion.versionNumber,
      assessmentType: input.assessmentType,
      name,
      selection,
      groupStatus: 'ACTIVE',
      assignmentStatus,
      availableFrom,
      dueAt,
      createdAt: now,
    };
  }
}

import {
  AppError,
  IMPORT_JOB_TTL_SECONDS,
  MASTER_STATUS_ACTIVE,
  type ImportJobDto,
  type ImportPreviewResultDto,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import type { ImportLookupRepositoryPort } from '../ports/import-lookup-repository';
import type {
  ImportJobRecord,
  ImportJobRepositoryPort,
  NewImportJobRow,
} from '../ports/import-job-repository';
import type { ImportCommitRepositoryPort } from '../ports/import-commit-repository';
import type { NewParticipant, ParticipantRepositoryPort } from '../ports/participant-repository';
import type { NewRelation, RelationRepositoryPort } from '../ports/evaluator-relation-repository';
import type { ProgramRepositoryPort, ProgramRow } from '../ports/program-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { sha256Hex } from '../auth/crypto-utils';
import {
  classifyEvaluatorRows,
  classifyParticipantRows,
  summarize,
  type ClassifiedRow,
  type EvaluatorRowInput,
  type ParticipantRowInput,
} from './import-validators';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { loadScopeFilter } from './scope-util';
import { actorHasPermission, type AdminContext, type ScopeFilter } from './types';

function sanitizeFileName(name: string | undefined): string | null {
  if (!name) return null;
  return name.replace(/[^\w.\- ]/g, '').slice(0, 200) || null;
}

export interface ImportDeps {
  importJobs: ImportJobRepositoryPort;
  commit: ImportCommitRepositoryPort;
  lookups: ImportLookupRepositoryPort;
  programs: ProgramRepositoryPort;
  assessmentTypes: AssessmentTypeRepositoryPort;
  participants: ParticipantRepositoryPort;
  relations: RelationRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

export class ImportService {
  constructor(private readonly deps: ImportDeps) {}

  private toDto(job: ImportJobRecord): ImportJobDto {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      programId: job.programId,
      fileName: job.fileName,
      totalRows: job.totalRows,
      validRows: job.validRows,
      skippedRows: job.skippedRows,
      errorRows: job.errorRows,
      errorSummary: job.errorSummary,
      createdAt: job.createdAt,
      committedAt: job.committedAt,
    };
  }

  private async requireProgramInScope(
    programId: string,
    ctx: AdminContext,
  ): Promise<{ program: ProgramRow; scope: ScopeFilter }> {
    const program = await this.deps.programs.findById(programId);
    if (!program) {
      throw new AppError('NOT_FOUND', 'Program tidak ditemukan.', 404);
    }
    if (program.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError('CONFLICT', 'Program tidak aktif.', 409);
    }
    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    // Gate tingkat program: scope dianggap dapat mengakses program bila ada baris
    // scope yang berpotensi mencakup program ini. batchId sengaja diabaikan di sini
    // (admin batch-scope tetap boleh masuk); pembatasan batch ditegakkan per-row.
    if (scope.kind === 'scoped') {
      const overlapsProgram = scope.rows.some(
        (row) =>
          (!row.programId || row.programId === programId) &&
          (!row.organizationId || row.organizationId === program.organizationId),
      );
      if (!overlapsProgram) {
        throw new AppError('FORBIDDEN', 'Program di luar scope administratif Anda.', 403);
      }
    }
    return { program, scope };
  }

  private async persistPreview(
    type: 'PARTICIPANT' | 'EVALUATOR',
    programId: string,
    fileName: string | undefined,
    inputRows: unknown[],
    classified: ClassifiedRow[],
    ctx: AdminContext,
  ): Promise<ImportPreviewResultDto> {
    const counts = summarize(classified);
    const checksum = await sha256Hex(JSON.stringify(inputRows));
    const now = this.deps.clock.now();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + IMPORT_JOB_TTL_SECONDS * 1000).toISOString();
    const jobId = generateId('imp');
    const rows: NewImportJobRow[] = classified.map((r) => ({
      id: generateId('impr'),
      rowNumber: r.rowNumber,
      status: r.status,
      message: r.message,
      normalized: r.normalized ? JSON.stringify(r.normalized) : null,
      createdAt: nowIso,
    }));
    await this.deps.importJobs.create(
      {
        id: jobId,
        type,
        status: 'PREVIEWED',
        createdBy: ctx.actor.id,
        programId,
        fileName: sanitizeFileName(fileName),
        checksum,
        totalRows: counts.total,
        validRows: counts.valid,
        skippedRows: counts.skipped,
        errorRows: counts.error,
        errorSummary: counts.error > 0 ? `${counts.error} baris error` : null,
        expiresAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      rows,
    );
    await this.deps.audit.record(
      type === 'PARTICIPANT'
        ? ADMIN_AUDIT_ACTIONS.PARTICIPANT_IMPORT_PREVIEWED
        : ADMIN_AUDIT_ACTIONS.EVALUATOR_IMPORT_PREVIEWED,
      ctx,
      'import_job',
      jobId,
      `valid ${counts.valid}, skipped ${counts.skipped}, error ${counts.error}`,
    );
    const job = await this.deps.importJobs.findById(jobId);
    return {
      job: this.toDto(job as ImportJobRecord),
      rows: classified.map((r) => ({ rowNumber: r.rowNumber, status: r.status, message: r.message })),
    };
  }

  async previewParticipants(
    programId: string,
    fileName: string | undefined,
    rows: ParticipantRowInput[],
    ctx: AdminContext,
  ): Promise<ImportPreviewResultDto> {
    const { program, scope } = await this.requireProgramInScope(programId, ctx);
    const userCodes = [...new Set(rows.map((r) => r.userId.trim()).filter(Boolean))];
    const batchCodes = [...new Set(rows.map((r) => r.batchCode.trim()).filter(Boolean))];
    const [usersByCode, batchIdByCode, activeParticipantUserIds] = await Promise.all([
      this.deps.lookups.findUsersByCodes(userCodes),
      this.deps.lookups.findBatchCodes(programId, batchCodes),
      this.deps.lookups.findActiveParticipantUserIds(programId),
    ]);
    const classified = classifyParticipantRows(rows, {
      usersByCode,
      batchIdByCode,
      activeParticipantUserIds,
      scope,
      programId,
      programOrganizationId: program.organizationId,
    });
    return this.persistPreview('PARTICIPANT', programId, fileName, rows, classified, ctx);
  }

  async previewEvaluators(
    programId: string,
    fileName: string | undefined,
    rows: EvaluatorRowInput[],
    ctx: AdminContext,
  ): Promise<ImportPreviewResultDto> {
    const { scope } = await this.requireProgramInScope(programId, ctx);
    const codes = [
      ...new Set(
        rows.flatMap((r) => [r.subjectUserId.trim(), r.evaluatorUserId.trim()]).filter(Boolean),
      ),
    ];
    const [participantsByUserCode, activeRelationKeys, types] = await Promise.all([
      this.deps.lookups.findActiveParticipantsByUserCodes(programId, codes),
      this.deps.lookups.findActiveRelationKeys(programId),
      this.deps.assessmentTypes.list(),
    ]);
    const typeIdByCode = new Map(types.map((t) => [t.code, t.id]));
    const classified = classifyEvaluatorRows(rows, {
      participantsByUserCode,
      activeRelationKeys,
      typeIdByCode,
      scope,
      programId,
    });
    return this.persistPreview('EVALUATOR', programId, fileName, rows, classified, ctx);
  }

  async getJob(jobId: string, ctx: AdminContext): Promise<ImportPreviewResultDto> {
    const job = await this.deps.importJobs.findById(jobId);
    if (!job) {
      throw new AppError('NOT_FOUND', 'Import job tidak ditemukan.', 404);
    }
    if (job.createdBy !== ctx.actor.id && !ctx.actor.roles.includes('SUPERADMIN')) {
      throw new AppError('FORBIDDEN', 'Import job milik actor lain.', 403);
    }
    const rows = await this.deps.importJobs.listRows(jobId);
    return {
      job: this.toDto(job),
      rows: rows
        .sort((a, b) => a.rowNumber - b.rowNumber)
        .map((r) => ({ rowNumber: r.rowNumber, status: r.status, message: r.message })),
    };
  }

  async commit(jobId: string, ctx: AdminContext): Promise<ImportJobDto> {
    const job = await this.deps.importJobs.findById(jobId);
    if (!job) {
      throw new AppError('NOT_FOUND', 'Import job tidak ditemukan.', 404);
    }
    // Hanya pembuat job atau SUPERADMIN.
    if (job.createdBy !== ctx.actor.id && !ctx.actor.roles.includes('SUPERADMIN')) {
      throw new AppError('FORBIDDEN', 'Import job milik actor lain.', 403);
    }
    const requiredPerm = job.type === 'PARTICIPANT' ? 'participant.import' : 'evaluator.import';
    if (!actorHasPermission(ctx.actor, requiredPerm)) {
      throw new AppError('FORBIDDEN', 'Anda tidak memiliki permission untuk commit job ini.', 403);
    }
    const now = this.deps.clock.now();
    const nowIso = now.toISOString();
    if (job.status === 'COMMITTED') {
      throw new AppError('CONFLICT', 'Import job sudah di-commit.', 409);
    }
    if (job.expiresAt && now.getTime() > new Date(job.expiresAt).getTime()) {
      await this.deps.importJobs.setStatus(jobId, 'EXPIRED', { updatedAt: nowIso });
      throw new AppError('CONFLICT', 'Import job sudah kedaluwarsa.', 409);
    }
    if (job.status !== 'PREVIEWED') {
      throw new AppError('CONFLICT', 'Import job tidak dapat di-commit pada status ini.', 409);
    }
    if (job.errorRows > 0) {
      throw new AppError('CONFLICT', 'Import job memiliki baris error.', 409);
    }
    if (!job.programId) {
      throw new AppError('CONFLICT', 'Import job tidak memiliki program.', 409);
    }
    const { program, scope } = await this.requireProgramInScope(job.programId, ctx);
    const programId = job.programId;
    const withinScope = (batchId: string | null, organizationId: string | null): boolean =>
      scope.kind !== 'scoped' || isWithinScope([], scope.rows, { programId, batchId, organizationId });

    // Re-validasi SELURUH row VALID di luar transaksi: scope per-row dan kondisi aktif.
    // Bila ada row yang kini di luar scope, commit ditolak (tanpa partial write).
    const rows = (await this.deps.importJobs.listRows(jobId)).filter((r) => r.status === 'VALID');

    if (job.type === 'PARTICIPANT') {
      const inserts: NewParticipant[] = [];
      for (const r of rows) {
        const data = JSON.parse(r.normalized ?? '{}') as {
          userDbId: string;
          batchId: string | null;
        };
        if (!withinScope(data.batchId, program.organizationId)) {
          throw new AppError('FORBIDDEN', 'Sebuah baris tidak lagi berada dalam scope Anda.', 403);
        }
        // Deterministik: participant yang sudah aktif setelah preview di-skip.
        if (await this.deps.participants.findActiveByUserAndProgram(data.userDbId, programId)) {
          continue;
        }
        inserts.push({
          id: generateId('pp'),
          userId: data.userDbId,
          programId,
          batchId: data.batchId,
          organizationId: program.organizationId,
          employeeId: null,
          position: null,
          unit: null,
          status: MASTER_STATUS_ACTIVE,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
      await this.deps.importJobs.setStatus(jobId, 'COMMITTING', { updatedAt: nowIso });
      try {
        await this.deps.commit.commitParticipants(jobId, nowIso, inserts);
      } catch (err) {
        return this.fail(jobId, ctx, err);
      }
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.PARTICIPANT_IMPORT_COMMITTED, ctx, 'import_job', jobId, `applied ${inserts.length}`);
    } else {
      const inserts: NewRelation[] = [];
      const reactivateIds: string[] = [];
      for (const r of rows) {
        const data = JSON.parse(r.normalized ?? '{}') as {
          subjectParticipantId: string;
          evaluatorUserId: string;
          assessmentTypeId: string;
        };
        const subject = await this.deps.participants.findById(data.subjectParticipantId);
        const evaluator = await this.deps.participants.findActiveByUserAndProgram(data.evaluatorUserId, programId);
        // Deterministik: participant yang hilang/arsip setelah preview di-skip.
        if (!subject || subject.status !== MASTER_STATUS_ACTIVE || !evaluator) {
          continue;
        }
        if (!withinScope(subject.batchId, subject.organizationId) || !withinScope(evaluator.batchId, evaluator.organizationId)) {
          throw new AppError('FORBIDDEN', 'Subject atau evaluator tidak lagi berada dalam scope Anda.', 403);
        }
        const existing = await this.deps.relations.findByTriple(
          data.subjectParticipantId,
          data.evaluatorUserId,
          data.assessmentTypeId,
        );
        if (existing && existing.status === MASTER_STATUS_ACTIVE) {
          continue;
        }
        if (existing) {
          reactivateIds.push(existing.id);
        } else {
          inserts.push({
            id: generateId('er'),
            programParticipantId: data.subjectParticipantId,
            evaluatorUserId: data.evaluatorUserId,
            assessmentTypeId: data.assessmentTypeId,
            status: MASTER_STATUS_ACTIVE,
            assignedAt: nowIso,
            assignedBy: ctx.actor.id,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
      await this.deps.importJobs.setStatus(jobId, 'COMMITTING', { updatedAt: nowIso });
      try {
        await this.deps.commit.commitEvaluators(jobId, nowIso, inserts, reactivateIds);
      } catch (err) {
        return this.fail(jobId, ctx, err);
      }
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.EVALUATOR_IMPORT_COMMITTED, ctx, 'import_job', jobId, `applied ${inserts.length + reactivateIds.length}`);
    }

    const updated = await this.deps.importJobs.findById(jobId);
    return this.toDto(updated as ImportJobRecord);
  }

  private async fail(jobId: string, ctx: AdminContext, err: unknown): Promise<never> {
    await this.deps.importJobs.setStatus(jobId, 'FAILED', {
      errorSummary: 'Commit gagal.',
      updatedAt: this.deps.clock.now().toISOString(),
    });
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.IMPORT_FAILED, ctx, 'import_job', jobId, null);
    if (err instanceof AppError) throw err;
    throw new AppError('INTERNAL_ERROR', 'Commit import gagal.', 500);
  }
}

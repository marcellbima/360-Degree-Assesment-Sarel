import {
  AppError,
  MASTER_STATUS_ACTIVE,
  MASTER_STATUS_ARCHIVED,
  type Paginated,
  type ParticipantDto,
  type ParticipantTargetSummary,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import type { BatchRepositoryPort } from '../ports/batch-repository';
import type { ProgramRepositoryPort } from '../ports/program-repository';
import type { UserRepositoryPort } from '../ports/user-repository';
import type {
  ParticipantRepositoryPort,
  ParticipantRow,
} from '../ports/participant-repository';
import type { ParticipantTargetRepositoryPort } from '../ports/participant-target-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { loadScopeFilter } from './scope-util';
import { buildPage, offsetOf, type AdminContext, type ScopeFilter } from './types';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  batchId?: string;
  status?: string;
  sortBy: 'userCode' | 'fullName' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
}
interface CreateInput {
  userId?: string;
  userDbId?: string;
  batchId: string;
}
interface UpdateInput {
  batchId?: string;
  position?: string;
  unit?: string;
  employeeId?: string;
}

function emptySummary(): ParticipantTargetSummary {
  return { SELF: 0, SUPERIOR: 0, PEER: 0, SUBORDINATE: 0 };
}

export interface ParticipantDeps {
  participants: ParticipantRepositoryPort;
  programs: ProgramRepositoryPort;
  batches: BatchRepositoryPort;
  users: UserRepositoryPort;
  targets: ParticipantTargetRepositoryPort;
  assessmentTypes: AssessmentTypeRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

export class ParticipantService {
  constructor(private readonly deps: ParticipantDeps) {}

  private toDto(row: ParticipantRow, extra?: Partial<ParticipantDto>): ParticipantDto {
    return {
      id: row.id,
      userId: row.userId,
      userCode: row.userCode,
      npk: row.npk,
      fullName: row.fullName,
      email: row.email,
      programId: row.programId,
      programCode: row.programCode,
      batchId: row.batchId,
      batchCode: row.batchCode,
      status: row.status,
      ...extra,
    };
  }

  private scopeTarget(row: ParticipantRow) {
    return { programId: row.programId, batchId: row.batchId, organizationId: row.organizationId };
  }

  private ensureScope(scope: ScopeFilter, row: ParticipantRow): void {
    if (scope.kind === 'scoped' && !isWithinScope([], scope.rows, this.scopeTarget(row))) {
      throw new AppError('FORBIDDEN', 'Participant berada di luar scope administratif Anda.', 403);
    }
  }

  async list(programId: string, query: ListQuery, ctx: AdminContext): Promise<Paginated<ParticipantDto>> {
    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    const { items, total } = await this.deps.participants.list({
      programId,
      search: query.search,
      batchId: query.batchId,
      status: query.status,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      scope,
    });
    return buildPage(items.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<ParticipantRow> {
    const row = await this.deps.participants.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'Participant tidak ditemukan.', 404);
    }
    this.ensureScope(await loadScopeFilter(this.deps.scopes, ctx), row);
    return row;
  }

  private async buildSummaries(
    participantId: string,
  ): Promise<{ targets: ParticipantTargetSummary; relationCounts: ParticipantTargetSummary }> {
    const [types, targetRows, relCounts] = await Promise.all([
      this.deps.assessmentTypes.list(),
      this.deps.targets.findByParticipant(participantId),
      this.deps.participants.countActiveRelationsBySubject(participantId),
    ]);
    const codeById = new Map(types.map((t) => [t.id, t.code]));
    const targets = emptySummary();
    for (const r of targetRows) {
      const code = codeById.get(r.assessmentTypeId);
      if (code && code in targets) targets[code as keyof ParticipantTargetSummary] = r.targetCount;
    }
    const relationCounts = emptySummary();
    for (const [code, n] of Object.entries(relCounts)) {
      if (code in relationCounts) relationCounts[code as keyof ParticipantTargetSummary] = n;
    }
    return { targets, relationCounts };
  }

  async get(id: string, ctx: AdminContext): Promise<ParticipantDto> {
    const row = await this.loadVisible(id, ctx);
    const { targets, relationCounts } = await this.buildSummaries(id);
    return this.toDto(row, { targets, relationCounts });
  }

  private async requireActiveProgram(programId: string) {
    const program = await this.deps.programs.findById(programId);
    if (!program) {
      throw new AppError('NOT_FOUND', 'Program tidak ditemukan.', 404);
    }
    if (program.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError('CONFLICT', 'Program tidak aktif.', 409);
    }
    return program;
  }

  private async requireActiveBatchInProgram(batchId: string, programId: string) {
    const batch = await this.deps.batches.findById(batchId);
    if (!batch || batch.programId !== programId) {
      throw new AppError('VALIDATION_ERROR', 'Batch tidak ditemukan pada program ini.', 400);
    }
    if (batch.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError('CONFLICT', 'Batch tidak aktif.', 409);
    }
    return batch;
  }

  async create(programId: string, input: CreateInput, ctx: AdminContext): Promise<ParticipantDto> {
    const program = await this.requireActiveProgram(programId);
    const batch = await this.requireActiveBatchInProgram(input.batchId, programId);

    const user = input.userDbId
      ? await this.deps.users.findById(input.userDbId)
      : input.userId
        ? await this.deps.users.findByUserId(input.userId)
        : null;
    if (!user) {
      throw new AppError('VALIDATION_ERROR', 'User tidak ditemukan.', 400);
    }

    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId,
        batchId: batch.id,
        organizationId: program.organizationId,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Di luar scope administratif Anda.', 403);
    }

    if (await this.deps.participants.findActiveByUserAndProgram(user.id, programId)) {
      throw new AppError('CONFLICT', 'User sudah menjadi participant aktif pada program ini.', 409);
    }

    const now = this.deps.clock.now().toISOString();
    const id = generateId('pp');
    await this.deps.participants.insert({
      id,
      userId: user.id,
      programId,
      batchId: batch.id,
      organizationId: program.organizationId,
      employeeId: null,
      position: null,
      unit: null,
      status: MASTER_STATUS_ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.PARTICIPANT_CREATED, ctx, 'participant', id, `Program ${programId}, batch ${batch.id}.`);
    const created = await this.deps.participants.findById(id);
    return this.toDto(created ?? (await this.loadVisible(id, ctx)));
  }

  async update(id: string, input: UpdateInput, ctx: AdminContext): Promise<ParticipantDto> {
    const row = await this.loadVisible(id, ctx);
    const now = this.deps.clock.now().toISOString();

    if (input.batchId && input.batchId !== row.batchId) {
      const batch = await this.requireActiveBatchInProgram(input.batchId, row.programId);
      if (await this.deps.participants.hasDependents(id)) {
        throw new AppError(
          'CONFLICT',
          'Participant memiliki relation atau target sehingga batch tidak dapat dipindahkan.',
          409,
        );
      }
      const scope = await loadScopeFilter(this.deps.scopes, ctx);
      if (
        scope.kind === 'scoped' &&
        !isWithinScope([], scope.rows, {
          programId: row.programId,
          batchId: batch.id,
          organizationId: row.organizationId,
        })
      ) {
        throw new AppError('FORBIDDEN', 'Batch tujuan di luar scope administratif Anda.', 403);
      }
      await this.deps.participants.update(id, { batchId: batch.id, updatedAt: now });
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.PARTICIPANT_BATCH_CHANGED, ctx, 'participant', id, `Batch -> ${batch.id}.`);
    }

    const patch: { position?: string; unit?: string; employeeId?: string; updatedAt: string } = { updatedAt: now };
    if (input.position !== undefined) patch.position = input.position;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.employeeId !== undefined) patch.employeeId = input.employeeId;
    if (Object.keys(patch).length > 1) {
      await this.deps.participants.update(id, patch);
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.PARTICIPANT_UPDATED, ctx, 'participant', id, null);
    }

    return this.get(id, ctx);
  }

  async setStatus(id: string, archived: boolean, ctx: AdminContext): Promise<ParticipantDto> {
    const row = await this.loadVisible(id, ctx);
    const status = archived ? MASTER_STATUS_ARCHIVED : MASTER_STATUS_ACTIVE;
    if (!archived) {
      // Reaktivasi: pastikan tidak ada participant aktif lain untuk user+program.
      const active = await this.deps.participants.findActiveByUserAndProgram(row.userId, row.programId);
      if (active && active.id !== id) {
        throw new AppError('CONFLICT', 'Sudah ada participant aktif untuk user ini pada program.', 409);
      }
    }
    const now = this.deps.clock.now().toISOString();
    await this.deps.participants.setStatus(id, status, now);
    await this.deps.audit.record(
      archived ? ADMIN_AUDIT_ACTIONS.PARTICIPANT_ARCHIVED : ADMIN_AUDIT_ACTIONS.PARTICIPANT_ACTIVATED,
      ctx,
      'participant',
      id,
      null,
    );
    return this.get(id, ctx);
  }
}

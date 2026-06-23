import {
  AppError,
  MASTER_STATUS_ACTIVE,
  MASTER_STATUS_ARCHIVED,
  type EvaluatorRelationDto,
  type Paginated,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import type { ParticipantRepositoryPort, ParticipantRow } from '../ports/participant-repository';
import type {
  RelationRepositoryPort,
  RelationRow,
} from '../ports/evaluator-relation-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { loadScopeFilter } from './scope-util';
import { buildPage, offsetOf, type AdminContext, type ScopeFilter } from './types';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  assessmentType?: string;
  subjectBatchId?: string;
  evaluatorBatchId?: string;
  status?: string;
  sortBy: 'assessmentType' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
}
interface CreateInput {
  subjectParticipantId: string;
  evaluatorParticipantId: string;
  assessmentType: string;
}

export interface EvaluatorRelationDeps {
  relations: RelationRepositoryPort;
  participants: ParticipantRepositoryPort;
  assessmentTypes: AssessmentTypeRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

export class EvaluatorRelationService {
  constructor(private readonly deps: EvaluatorRelationDeps) {}

  private toDto(row: RelationRow): EvaluatorRelationDto {
    return {
      id: row.id,
      programId: row.programId,
      assessmentType: row.assessmentType,
      subjectParticipantId: row.subjectParticipantId,
      subjectUserCode: row.subjectUserCode,
      subjectName: row.subjectName,
      subjectBatchId: row.subjectBatchId,
      evaluatorParticipantId: row.evaluatorParticipantId,
      evaluatorUserId: row.evaluatorUserId,
      evaluatorUserCode: row.evaluatorUserCode,
      evaluatorName: row.evaluatorName,
      evaluatorBatchId: row.evaluatorBatchId,
      status: row.status,
    };
  }

  private async typeIdByCode(code: string): Promise<string> {
    const t = (await this.deps.assessmentTypes.list()).find((x) => x.code === code);
    if (!t) {
      throw new AppError('VALIDATION_ERROR', `Assessment type ${code} tidak dikenal.`, 400);
    }
    return t.id;
  }

  private ensureScopeBoth(scope: ScopeFilter, subject: ParticipantRow, evaluator: ParticipantRow): void {
    if (scope.kind !== 'scoped') return;
    const subjOk = isWithinScope([], scope.rows, {
      programId: subject.programId,
      batchId: subject.batchId,
      organizationId: subject.organizationId,
    });
    const evalOk = isWithinScope([], scope.rows, {
      programId: evaluator.programId,
      batchId: evaluator.batchId,
      organizationId: evaluator.organizationId,
    });
    if (!subjOk || !evalOk) {
      throw new AppError('FORBIDDEN', 'Subject atau evaluator di luar scope administratif Anda.', 403);
    }
  }

  async list(programId: string, query: ListQuery, ctx: AdminContext): Promise<Paginated<EvaluatorRelationDto>> {
    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    const { items, total } = await this.deps.relations.list({
      programId,
      search: query.search,
      assessmentType: query.assessmentType,
      subjectBatchId: query.subjectBatchId,
      evaluatorBatchId: query.evaluatorBatchId,
      status: query.status,
      limit: query.pageSize,
      offset: offsetOf(query.page, query.pageSize),
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      scope,
    });
    return buildPage(items.map((r) => this.toDto(r)), total, query.page, query.pageSize);
  }

  private async loadVisible(id: string, ctx: AdminContext): Promise<RelationRow> {
    const row = await this.deps.relations.findById(id);
    if (!row) {
      throw new AppError('NOT_FOUND', 'Evaluator relation tidak ditemukan.', 404);
    }
    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    if (scope.kind === 'scoped') {
      const subjOk = isWithinScope([], scope.rows, {
        programId: row.programId,
        batchId: row.subjectBatchId,
        organizationId: row.subjectOrganizationId,
      });
      const evalOk = isWithinScope([], scope.rows, {
        programId: row.programId,
        batchId: row.evaluatorBatchId,
        organizationId: row.evaluatorOrganizationId,
      });
      if (!subjOk || !evalOk) {
        throw new AppError('FORBIDDEN', 'Relation di luar scope administratif Anda.', 403);
      }
    }
    return row;
  }

  async get(id: string, ctx: AdminContext): Promise<EvaluatorRelationDto> {
    return this.toDto(await this.loadVisible(id, ctx));
  }

  async create(programId: string, input: CreateInput, ctx: AdminContext): Promise<EvaluatorRelationDto> {
    if (!['SUPERIOR', 'PEER', 'SUBORDINATE'].includes(input.assessmentType)) {
      throw new AppError('VALIDATION_ERROR', 'Assessment type tidak didukung (SELF implisit).', 400);
    }
    if (input.subjectParticipantId === input.evaluatorParticipantId) {
      throw new AppError('VALIDATION_ERROR', 'Subject dan evaluator tidak boleh sama.', 400);
    }
    const subject = await this.deps.participants.findById(input.subjectParticipantId);
    const evaluator = await this.deps.participants.findById(input.evaluatorParticipantId);
    if (!subject || !evaluator) {
      throw new AppError('VALIDATION_ERROR', 'Subject atau evaluator tidak ditemukan.', 400);
    }
    if (subject.programId !== programId || evaluator.programId !== programId) {
      throw new AppError('VALIDATION_ERROR', 'Subject dan evaluator harus berada pada program ini.', 400);
    }
    if (subject.status !== MASTER_STATUS_ACTIVE || evaluator.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError('CONFLICT', 'Subject dan evaluator harus aktif.', 409);
    }
    if (subject.userId === evaluator.userId) {
      throw new AppError('VALIDATION_ERROR', 'Evaluator tidak boleh menilai dirinya sendiri.', 400);
    }

    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    this.ensureScopeBoth(scope, subject, evaluator);

    const typeId = await this.typeIdByCode(input.assessmentType);
    const existing = await this.deps.relations.findByTriple(subject.id, evaluator.userId, typeId);
    const now = this.deps.clock.now().toISOString();
    if (existing) {
      if (existing.status === MASTER_STATUS_ACTIVE) {
        throw new AppError('CONFLICT', 'Relation sudah ada dan aktif.', 409);
      }
      // Reaktivasi relation historis (menjaga unique index total).
      await this.deps.relations.setStatus(existing.id, MASTER_STATUS_ACTIVE, now);
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.EVALUATOR_RELATION_ACTIVATED, ctx, 'evaluator_relation', existing.id, null);
      return this.get(existing.id, ctx);
    }

    const id = generateId('er');
    await this.deps.relations.insert({
      id,
      programParticipantId: subject.id,
      evaluatorUserId: evaluator.userId,
      assessmentTypeId: typeId,
      status: MASTER_STATUS_ACTIVE,
      assignedAt: now,
      assignedBy: ctx.actor.id,
      createdAt: now,
      updatedAt: now,
    });
    await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.EVALUATOR_RELATION_CREATED, ctx, 'evaluator_relation', id, `Type ${input.assessmentType}.`);
    return this.get(id, ctx);
  }

  async update(id: string, assessmentType: string, ctx: AdminContext): Promise<EvaluatorRelationDto> {
    const row = await this.loadVisible(id, ctx);
    const typeId = await this.typeIdByCode(assessmentType);
    if (typeId !== row.assessmentTypeId) {
      const dup = await this.deps.relations.findByTriple(row.subjectParticipantId, row.evaluatorUserId, typeId);
      if (dup && dup.id !== id && dup.status === MASTER_STATUS_ACTIVE) {
        throw new AppError('CONFLICT', 'Relation dengan tipe tersebut sudah ada.', 409);
      }
      const now = this.deps.clock.now().toISOString();
      await this.deps.relations.setType(id, typeId, now);
      await this.deps.audit.record(ADMIN_AUDIT_ACTIONS.EVALUATOR_RELATION_UPDATED, ctx, 'evaluator_relation', id, `Type -> ${assessmentType}.`);
    }
    return this.get(id, ctx);
  }

  async setStatus(id: string, archived: boolean, ctx: AdminContext): Promise<EvaluatorRelationDto> {
    const row = await this.loadVisible(id, ctx);
    const now = this.deps.clock.now().toISOString();
    if (!archived) {
      const dup = await this.deps.relations.findByTriple(row.subjectParticipantId, row.evaluatorUserId, row.assessmentTypeId);
      if (dup && dup.id !== id && dup.status === MASTER_STATUS_ACTIVE) {
        throw new AppError('CONFLICT', 'Sudah ada relation aktif yang sama.', 409);
      }
    }
    await this.deps.relations.setStatus(id, archived ? MASTER_STATUS_ARCHIVED : MASTER_STATUS_ACTIVE, now);
    await this.deps.audit.record(
      archived ? ADMIN_AUDIT_ACTIONS.EVALUATOR_RELATION_ARCHIVED : ADMIN_AUDIT_ACTIONS.EVALUATOR_RELATION_ACTIVATED,
      ctx,
      'evaluator_relation',
      id,
      null,
    );
    return this.get(id, ctx);
  }
}

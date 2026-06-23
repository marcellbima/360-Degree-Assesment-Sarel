import {
  AppError,
  MASTER_STATUS_ACTIVE,
  type ParticipantTargetSummary,
  type ParticipantTargetsDto,
} from '@sarel/shared';
import type { ClockPort } from '../ports/clock';
import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import type { ParticipantRepositoryPort, ParticipantRow } from '../ports/participant-repository';
import type {
  NewParticipantTarget,
  ParticipantTargetRepositoryPort,
} from '../ports/participant-target-repository';
import { isWithinScope } from '../auth/admin-scope-policy';
import { ADMIN_AUDIT_ACTIONS, type AdminAuditWriter } from './audit';
import { generateId } from './id';
import { loadScopeFilter } from './scope-util';
import type { AdminContext } from './types';

const TYPE_CODES: (keyof ParticipantTargetSummary)[] = ['SELF', 'SUPERIOR', 'PEER', 'SUBORDINATE'];

interface TargetsInput {
  SELF?: number;
  SUPERIOR?: number;
  PEER?: number;
  SUBORDINATE?: number;
}

export interface AssessmentTargetDeps {
  participants: ParticipantRepositoryPort;
  targets: ParticipantTargetRepositoryPort;
  assessmentTypes: AssessmentTypeRepositoryPort;
  scopes: AdminScopeRepositoryPort;
  clock: ClockPort;
  audit: AdminAuditWriter;
}

export class AssessmentTargetService {
  constructor(private readonly deps: AssessmentTargetDeps) {}

  private async loadVisible(participantId: string, ctx: AdminContext): Promise<ParticipantRow> {
    const row = await this.deps.participants.findById(participantId);
    if (!row) {
      throw new AppError('NOT_FOUND', 'Participant tidak ditemukan.', 404);
    }
    const scope = await loadScopeFilter(this.deps.scopes, ctx);
    if (
      scope.kind === 'scoped' &&
      !isWithinScope([], scope.rows, {
        programId: row.programId,
        batchId: row.batchId,
        organizationId: row.organizationId,
      })
    ) {
      throw new AppError('FORBIDDEN', 'Participant berada di luar scope administratif Anda.', 403);
    }
    return row;
  }

  private async summary(participantId: string): Promise<ParticipantTargetSummary> {
    const [types, rows] = await Promise.all([
      this.deps.assessmentTypes.list(),
      this.deps.targets.findByParticipant(participantId),
    ]);
    const codeById = new Map(types.map((t) => [t.id, t.code]));
    const out: ParticipantTargetSummary = { SELF: 1, SUPERIOR: 0, PEER: 0, SUBORDINATE: 0 };
    for (const r of rows) {
      const code = codeById.get(r.assessmentTypeId);
      if (code && code in out) out[code as keyof ParticipantTargetSummary] = r.targetCount;
    }
    return out;
  }

  async get(participantId: string, ctx: AdminContext): Promise<ParticipantTargetsDto> {
    await this.loadVisible(participantId, ctx);
    return { participantId, targets: await this.summary(participantId) };
  }

  async put(
    participantId: string,
    input: TargetsInput,
    ctx: AdminContext,
  ): Promise<ParticipantTargetsDto> {
    const row = await this.loadVisible(participantId, ctx);
    if (row.status !== MASTER_STATUS_ACTIVE) {
      throw new AppError('CONFLICT', 'Participant tidak aktif.', 409);
    }
    if (input.SELF !== undefined && input.SELF !== 1) {
      throw new AppError('VALIDATION_ERROR', 'Target SELF wajib bernilai 1.', 400);
    }

    const types = await this.deps.assessmentTypes.list();
    const idByCode = new Map(types.map((t) => [t.code, t.id]));
    const existing = await this.deps.targets.findByParticipant(participantId);
    const codeById = new Map(types.map((t) => [t.id, t.code]));
    const current: Record<string, number> = { SELF: 1, SUPERIOR: 0, PEER: 0, SUBORDINATE: 0 };
    for (const r of existing) {
      const code = codeById.get(r.assessmentTypeId);
      if (code) current[code] = r.targetCount;
    }

    const now = this.deps.clock.now().toISOString();
    const newTargets: NewParticipantTarget[] = [];
    for (const code of TYPE_CODES) {
      const typeId = idByCode.get(code);
      if (!typeId) {
        throw new AppError('INTERNAL_ERROR', 'Assessment type belum tersedia.', 500);
      }
      let value = code === 'SELF' ? 1 : (input[code] ?? current[code] ?? 0);
      if (code === 'SELF') value = 1;
      if (!Number.isInteger(value) || value < 0) {
        throw new AppError('VALIDATION_ERROR', `Target ${code} tidak valid.`, 400);
      }
      newTargets.push({
        id: generateId('tgt'),
        programParticipantId: participantId,
        assessmentTypeId: typeId,
        targetCount: value,
        createdAt: now,
        updatedAt: now,
      });
    }
    await this.deps.targets.replace(participantId, newTargets);
    await this.deps.audit.record(
      ADMIN_AUDIT_ACTIONS.PARTICIPANT_TARGETS_UPDATED,
      ctx,
      'participant',
      participantId,
      null,
    );
    return { participantId, targets: await this.summary(participantId) };
  }
}

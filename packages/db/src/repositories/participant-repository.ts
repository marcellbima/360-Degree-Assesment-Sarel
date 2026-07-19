import { isNull, and, asc, count, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type {
  NewParticipant,
  ParticipantListFilter,
  ParticipantPatch,
  ParticipantRepositoryPort,
  ParticipantRow,
} from '@sarel/core';
import type { Db } from '../client';
import {
  assessmentTypes,
  batches,
  evaluatorRelations,
  participantAssessmentTargets,
  programParticipants,
  programs,
  users,
} from '../schema/schema';
import { participantScopeWhere } from './scope-sql';

const SELECT = {
  id: programParticipants.id,
  userId: users.id,
  userCode: users.userId,
  npk: users.npk,
  fullName: users.fullName,
  email: users.email,
  programId: programs.id,
  programCode: programs.code,
  batchId: programParticipants.batchId,
  batchCode: batches.code,
  organizationId: programParticipants.organizationId,
  status: programParticipants.status,
};

export class D1ParticipantRepository implements ParticipantRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  private baseJoin() {
    return this.db
      .select(SELECT)
      .from(programParticipants)
      .innerJoin(users, eq(users.id, programParticipants.userId))
      .innerJoin(programs, eq(programs.id, programParticipants.programId))
      .leftJoin(batches, eq(batches.id, programParticipants.batchId));
  }

  async list(filter: ParticipantListFilter): Promise<{ items: ParticipantRow[]; total: number }> {
    const conds: SQL[] = [eq(programParticipants.programId, filter.programId)];
    const scopeWhere = participantScopeWhere(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.withoutBatch) {
      conds.push(isNull(programParticipants.batchId));
    } else if (filter.batchId) {
      conds.push(eq(programParticipants.batchId, filter.batchId));
    }
    if (filter.status) conds.push(eq(programParticipants.status, filter.status));
    if (filter.search) {
      const q = `%${filter.search}%`;
      const term = or(like(users.userId, q), like(users.fullName, q), like(users.npk, q));
      if (term) conds.push(term);
    }
    const where = and(...conds);

    const sortCol = {
      userCode: users.userId,
      fullName: users.fullName,
      createdAt: programParticipants.createdAt,
      status: programParticipants.status,
    }[filter.sortBy];
    const order = filter.sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

    const totalRow = await this.db
      .select({ value: count() })
      .from(programParticipants)
      .innerJoin(users, eq(users.id, programParticipants.userId))
      .where(where)
      .get();
    const items = await this.baseJoin()
      .where(where)
      .orderBy(order)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items, total: totalRow?.value ?? 0 };
  }

  async findById(id: string): Promise<ParticipantRow | null> {
    return (await this.baseJoin().where(eq(programParticipants.id, id)).get()) ?? null;
  }

  async findActiveByUserAndProgram(userId: string, programId: string): Promise<ParticipantRow | null> {
    return (
      (await this.baseJoin()
        .where(
          and(
            eq(programParticipants.userId, userId),
            eq(programParticipants.programId, programId),
            eq(programParticipants.status, 'ACTIVE'),
          ),
        )
        .get()) ?? null
    );
  }

  async insert(row: NewParticipant): Promise<void> {
    await this.db
      .insert(programParticipants)
      .values({
        id: row.id,
        userId: row.userId,
        programId: row.programId,
        batchId: row.batchId,
        organizationId: row.organizationId,
        employeeId: row.employeeId,
        position: row.position,
        unit: row.unit,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .run();
  }

  async update(id: string, patch: ParticipantPatch): Promise<void> {
    const set: Record<string, string | null> = { updatedAt: patch.updatedAt };
    if (patch.batchId !== undefined) set.batchId = patch.batchId;
    if (patch.position !== undefined) set.position = patch.position;
    if (patch.unit !== undefined) set.unit = patch.unit;
    if (patch.employeeId !== undefined) set.employeeId = patch.employeeId;
    await this.db.update(programParticipants).set(set).where(eq(programParticipants.id, id)).run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db
      .update(programParticipants)
      .set({ status, updatedAt })
      .where(eq(programParticipants.id, id))
      .run();
  }

  async hasDependents(participantId: string): Promise<boolean> {
    const rel = await this.db
      .select({ value: count() })
      .from(evaluatorRelations)
      .where(eq(evaluatorRelations.programParticipantId, participantId))
      .get();
    if ((rel?.value ?? 0) > 0) return true;
    const tgt = await this.db
      .select({ value: count() })
      .from(participantAssessmentTargets)
      .where(eq(participantAssessmentTargets.programParticipantId, participantId))
      .get();
    return (tgt?.value ?? 0) > 0;
  }

  async countActiveRelationsBySubject(participantId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ code: assessmentTypes.code, value: count() })
      .from(evaluatorRelations)
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, evaluatorRelations.assessmentTypeId))
      .where(
        and(
          eq(evaluatorRelations.programParticipantId, participantId),
          eq(evaluatorRelations.status, 'ACTIVE'),
        ),
      )
      .groupBy(assessmentTypes.code)
      .all();
    const out: Record<string, number> = {};
    for (const r of rows) out[r.code] = r.value;
    return out;
  }
}

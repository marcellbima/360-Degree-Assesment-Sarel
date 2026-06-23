import { and, asc, count, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { ScopeFilter } from '@sarel/core';
import type {
  NewRelation,
  RelationListFilter,
  RelationRepositoryPort,
  RelationRow,
} from '@sarel/core';
import type { Db } from '../client';
import { assessmentTypes, evaluatorRelations, programParticipants, users } from '../schema/schema';

const subjP = alias(programParticipants, 'subj_p');
const evalP = alias(programParticipants, 'eval_p');
const subjU = alias(users, 'subj_u');
const evalU = alias(users, 'eval_u');

const SELECT = {
  id: evaluatorRelations.id,
  programId: subjP.programId,
  assessmentType: assessmentTypes.code,
  assessmentTypeId: evaluatorRelations.assessmentTypeId,
  subjectParticipantId: evaluatorRelations.programParticipantId,
  subjectUserCode: subjU.userId,
  subjectName: subjU.fullName,
  subjectBatchId: subjP.batchId,
  subjectOrganizationId: subjP.organizationId,
  evaluatorUserId: evaluatorRelations.evaluatorUserId,
  evaluatorUserCode: evalU.userId,
  evaluatorName: evalU.fullName,
  evaluatorParticipantId: evalP.id,
  evaluatorBatchId: evalP.batchId,
  evaluatorOrganizationId: evalP.organizationId,
  status: evaluatorRelations.status,
};

function subjectScopeWhere(scope: ScopeFilter): SQL | undefined {
  if (scope.kind === 'all') return undefined;
  const rows = scope.rows.filter((r) => r.programId || r.batchId || r.organizationId);
  if (rows.length === 0) return sql`0 = 1`;
  const ors = rows.map((r) => {
    const cs: SQL[] = [];
    if (r.programId) cs.push(eq(subjP.programId, r.programId));
    if (r.batchId) cs.push(eq(subjP.batchId, r.batchId));
    if (r.organizationId) cs.push(eq(subjP.organizationId, r.organizationId));
    return and(...cs) ?? sql`0 = 1`;
  });
  return or(...ors) ?? sql`0 = 1`;
}

export class D1RelationRepository implements RelationRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  private joined() {
    return this.db
      .select(SELECT)
      .from(evaluatorRelations)
      .innerJoin(subjP, eq(subjP.id, evaluatorRelations.programParticipantId))
      .innerJoin(subjU, eq(subjU.id, subjP.userId))
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, evaluatorRelations.assessmentTypeId))
      .innerJoin(evalU, eq(evalU.id, evaluatorRelations.evaluatorUserId))
      .leftJoin(
        evalP,
        and(eq(evalP.programId, subjP.programId), eq(evalP.userId, evaluatorRelations.evaluatorUserId)),
      );
  }

  async list(filter: RelationListFilter): Promise<{ items: RelationRow[]; total: number }> {
    const conds: SQL[] = [eq(subjP.programId, filter.programId)];
    const scopeWhere = subjectScopeWhere(filter.scope);
    if (scopeWhere) conds.push(scopeWhere);
    if (filter.assessmentType) conds.push(eq(assessmentTypes.code, filter.assessmentType));
    if (filter.subjectBatchId) conds.push(eq(subjP.batchId, filter.subjectBatchId));
    if (filter.evaluatorBatchId) conds.push(eq(evalP.batchId, filter.evaluatorBatchId));
    if (filter.status) conds.push(eq(evaluatorRelations.status, filter.status));
    if (filter.search) {
      const q = `%${filter.search}%`;
      const term = or(
        like(subjU.userId, q),
        like(subjU.fullName, q),
        like(evalU.userId, q),
        like(evalU.fullName, q),
      );
      if (term) conds.push(term);
    }
    const where = and(...conds);

    const sortCol = {
      assessmentType: assessmentTypes.code,
      createdAt: evaluatorRelations.createdAt,
      status: evaluatorRelations.status,
    }[filter.sortBy];
    const order = filter.sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

    const totalRow = await this.db
      .select({ value: count() })
      .from(evaluatorRelations)
      .innerJoin(subjP, eq(subjP.id, evaluatorRelations.programParticipantId))
      .innerJoin(subjU, eq(subjU.id, subjP.userId))
      .innerJoin(assessmentTypes, eq(assessmentTypes.id, evaluatorRelations.assessmentTypeId))
      .innerJoin(evalU, eq(evalU.id, evaluatorRelations.evaluatorUserId))
      .leftJoin(
        evalP,
        and(eq(evalP.programId, subjP.programId), eq(evalP.userId, evaluatorRelations.evaluatorUserId)),
      )
      .where(where)
      .get();

    const items = await this.joined()
      .where(where)
      .orderBy(order)
      .limit(filter.limit)
      .offset(filter.offset)
      .all();
    return { items, total: totalRow?.value ?? 0 };
  }

  async findById(id: string): Promise<RelationRow | null> {
    return (await this.joined().where(eq(evaluatorRelations.id, id)).get()) ?? null;
  }

  async findByTriple(
    programParticipantId: string,
    evaluatorUserId: string,
    assessmentTypeId: string,
  ): Promise<{ id: string; status: string } | null> {
    return (
      (await this.db
        .select({ id: evaluatorRelations.id, status: evaluatorRelations.status })
        .from(evaluatorRelations)
        .where(
          and(
            eq(evaluatorRelations.programParticipantId, programParticipantId),
            eq(evaluatorRelations.evaluatorUserId, evaluatorUserId),
            eq(evaluatorRelations.assessmentTypeId, assessmentTypeId),
          ),
        )
        .get()) ?? null
    );
  }

  async insert(row: NewRelation): Promise<void> {
    await this.db
      .insert(evaluatorRelations)
      .values({
        id: row.id,
        programParticipantId: row.programParticipantId,
        evaluatorUserId: row.evaluatorUserId,
        assessmentTypeId: row.assessmentTypeId,
        status: row.status,
        assignedAt: row.assignedAt,
        assignedBy: row.assignedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
      .run();
  }

  async setStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await this.db
      .update(evaluatorRelations)
      .set({ status, updatedAt })
      .where(eq(evaluatorRelations.id, id))
      .run();
  }

  async setType(id: string, assessmentTypeId: string, updatedAt: string): Promise<void> {
    await this.db
      .update(evaluatorRelations)
      .set({ assessmentTypeId, updatedAt })
      .where(eq(evaluatorRelations.id, id))
      .run();
  }
}

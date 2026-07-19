import { and, eq, inArray, sql } from 'drizzle-orm';
import type {
  ImportLookupRepositoryPort,
  ImportParticipantRef,
  ImportUserRef,
} from '@sarel/core';
import type { Db } from '../client';
import { batches, evaluatorRelations, programParticipants, users } from '../schema/schema';

export class D1ImportLookupRepository implements ImportLookupRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async findUsersByCodes(codes: string[]): Promise<Map<string, ImportUserRef>> {
    const map = new Map<string, ImportUserRef>();
    if (codes.length === 0) return map;
    const rows = await this.db
      .select({ id: users.id, userCode: users.userId, fullName: users.fullName })
      .from(users)
      .where(inArray(sql<string>`lower(${users.userId})`, codes.map((code) => code.toLowerCase())))
      .all();
    for (const r of rows) map.set(r.userCode.toLowerCase(), { id: r.id, userCode: r.userCode, fullName: r.fullName });
    return map;
  }

  async findBatchCodes(programId: string, codes: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (codes.length === 0) return map;
    const rows = await this.db
      .select({ id: batches.id, code: batches.code })
      .from(batches)
      .where(
        and(eq(batches.programId, programId), eq(batches.status, 'ACTIVE'), inArray(sql<string>`lower(${batches.code})`, codes.map((code) => code.toLowerCase()))),
      )
      .all();
    for (const r of rows) map.set(r.code.toLowerCase(), r.id);
    return map;
  }

  async findActiveParticipantUserIds(programId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ userId: programParticipants.userId })
      .from(programParticipants)
      .where(and(eq(programParticipants.programId, programId), eq(programParticipants.status, 'ACTIVE')))
      .all();
    return new Set(rows.map((r) => r.userId));
  }

  async findActiveParticipantsByUserCodes(
    programId: string,
    codes: string[],
  ): Promise<Map<string, ImportParticipantRef>> {
    const map = new Map<string, ImportParticipantRef>();
    if (codes.length === 0) return map;
    const rows = await this.db
      .select({
        participantId: programParticipants.id,
        userId: programParticipants.userId,
        userCode: users.userId,
        batchId: programParticipants.batchId,
        organizationId: programParticipants.organizationId,
      })
      .from(programParticipants)
      .innerJoin(users, eq(users.id, programParticipants.userId))
      .where(
        and(
          eq(programParticipants.programId, programId),
          eq(programParticipants.status, 'ACTIVE'),
          inArray(sql<string>`lower(${users.userId})`, codes.map((code) => code.toLowerCase())),
        ),
      )
      .all();
    for (const r of rows) {
      map.set(r.userCode.toLowerCase(), {
        participantId: r.participantId,
        userId: r.userId,
        userCode: r.userCode,
        batchId: r.batchId,
        organizationId: r.organizationId ?? null,
      });
    }
    return map;
  }

  async findActiveRelationKeys(programId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({
        subjectParticipantId: evaluatorRelations.programParticipantId,
        evaluatorUserId: evaluatorRelations.evaluatorUserId,
        assessmentTypeId: evaluatorRelations.assessmentTypeId,
      })
      .from(evaluatorRelations)
      .innerJoin(programParticipants, eq(programParticipants.id, evaluatorRelations.programParticipantId))
      .where(and(eq(programParticipants.programId, programId), eq(evaluatorRelations.status, 'ACTIVE')))
      .all();
    return new Set(rows.map((r) => `${r.subjectParticipantId}|${r.evaluatorUserId}|${r.assessmentTypeId}`));
  }
}

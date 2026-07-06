import {
  and,
  eq,
  inArray,
} from 'drizzle-orm';
import type {
  ImportLookupRepositoryPort,
  ImportParticipantRef,
  ImportUserRef,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import {
  batches,
  evaluatorRelations,
  programParticipants,
  users,
} from '../schema/postgres-schema';

export class PostgresImportLookupRepository
  implements ImportLookupRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async findUsersByCodes(
    codes: string[],
  ): Promise<Map<string, ImportUserRef>> {
    const result = new Map<string, ImportUserRef>();

    if (codes.length === 0) {
      return result;
    }

    const rows = await this.db
      .select({
        id: users.id,
        userCode: users.userId,
        fullName: users.fullName,
      })
      .from(users)
      .where(inArray(users.userId, codes));

    for (const row of rows) {
      result.set(row.userCode, {
        id: row.id,
        userCode: row.userCode,
        fullName: row.fullName,
      });
    }

    return result;
  }

  async findBatchCodes(
    programId: string,
    codes: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    if (codes.length === 0) {
      return result;
    }

    const rows = await this.db
      .select({
        id: batches.id,
        code: batches.code,
      })
      .from(batches)
      .where(
        and(
          eq(batches.programId, programId),
          eq(batches.status, 'ACTIVE'),
          inArray(batches.code, codes),
        ),
      );

    for (const row of rows) {
      result.set(row.code, row.id);
    }

    return result;
  }

  async findActiveParticipantUserIds(
    programId: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .select({
        userId: programParticipants.userId,
      })
      .from(programParticipants)
      .where(
        and(
          eq(
            programParticipants.programId,
            programId,
          ),
          eq(
            programParticipants.status,
            'ACTIVE',
          ),
        ),
      );

    return new Set(
      rows.map((row) => row.userId),
    );
  }

  async findActiveParticipantsByUserCodes(
    programId: string,
    codes: string[],
  ): Promise<Map<string, ImportParticipantRef>> {
    const result =
      new Map<string, ImportParticipantRef>();

    if (codes.length === 0) {
      return result;
    }

    const rows = await this.db
      .select({
        participantId: programParticipants.id,
        userId: programParticipants.userId,
        userCode: users.userId,
        batchId: programParticipants.batchId,
        organizationId:
          programParticipants.organizationId,
      })
      .from(programParticipants)
      .innerJoin(
        users,
        eq(users.id, programParticipants.userId),
      )
      .where(
        and(
          eq(
            programParticipants.programId,
            programId,
          ),
          eq(
            programParticipants.status,
            'ACTIVE',
          ),
          inArray(users.userId, codes),
        ),
      );

    for (const row of rows) {
      result.set(row.userCode, {
        participantId: row.participantId,
        userId: row.userId,
        userCode: row.userCode,
        batchId: row.batchId,
        organizationId:
          row.organizationId ?? null,
      });
    }

    return result;
  }

  async findActiveRelationKeys(
    programId: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .select({
        subjectParticipantId:
          evaluatorRelations.programParticipantId,
        evaluatorUserId:
          evaluatorRelations.evaluatorUserId,
        assessmentTypeId:
          evaluatorRelations.assessmentTypeId,
      })
      .from(evaluatorRelations)
      .innerJoin(
        programParticipants,
        eq(
          programParticipants.id,
          evaluatorRelations.programParticipantId,
        ),
      )
      .where(
        and(
          eq(
            programParticipants.programId,
            programId,
          ),
          eq(
            evaluatorRelations.status,
            'ACTIVE',
          ),
        ),
      );

    return new Set(
      rows.map(
        (row) =>
          `${row.subjectParticipantId}|${row.evaluatorUserId}|${row.assessmentTypeId}`,
      ),
    );
  }
}

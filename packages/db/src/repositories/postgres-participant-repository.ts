import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from 'drizzle-orm';
import type {
  NewParticipant,
  ParticipantListFilter,
  ParticipantPatch,
  ParticipantRepositoryPort,
  ParticipantRow,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  assessmentTypes,
  batches,
  evaluatorRelations,
  participantAssessmentTargets,
  programParticipants,
  programs,
  users,
} from '../schema/postgres-schema';
import {
  participantScopeWhere,
} from './postgres-scope-sql';

const participantSelect = {
  id: programParticipants.id,
  userId: users.id,
  userCode: users.userId,
  npk: users.npk,
  fullName: users.fullName,
  email: users.email,
  programId: programs.id,
  programCode: programs.code,
  batchId: batches.id,
  batchCode: batches.code,
  organizationId:
    programParticipants.organizationId,
  status: programParticipants.status,
};

export class PostgresParticipantRepository
  implements ParticipantRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private joined() {
    return this.db
      .select(participantSelect)
      .from(programParticipants)
      .innerJoin(
        users,
        eq(
          users.id,
          programParticipants.userId,
        ),
      )
      .innerJoin(
        programs,
        eq(
          programs.id,
          programParticipants.programId,
        ),
      )
      .innerJoin(
        batches,
        eq(
          batches.id,
          programParticipants.batchId,
        ),
      );
  }

  async list(
    filter: ParticipantListFilter,
  ): Promise<{
    items: ParticipantRow[];
    total: number;
  }> {
    const conditions: SQL[] = [
      eq(
        programParticipants.programId,
        filter.programId,
      ),
    ];

    const scopeCondition =
      participantScopeWhere(
        filter.scope,
      );

    if (scopeCondition) {
      conditions.push(
        scopeCondition,
      );
    }

    if (filter.batchId) {
      conditions.push(
        eq(
          programParticipants.batchId,
          filter.batchId,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(
          programParticipants.status,
          filter.status,
        ),
      );
    }

    if (filter.search) {
      const searchTerm =
        `%${filter.search}%`;

      const searchCondition = or(
        ilike(
          users.userId,
          searchTerm,
        ),
        ilike(
          users.fullName,
          searchTerm,
        ),
        ilike(
          users.npk,
          searchTerm,
        ),
      );

      if (searchCondition) {
        conditions.push(
          searchCondition,
        );
      }
    }

    const where =
      and(...conditions);

    const sortColumn = {
      userCode:
        users.userId,
      fullName:
        users.fullName,
      createdAt:
        programParticipants.createdAt,
      status:
        programParticipants.status,
    }[filter.sortBy];

    const order =
      filter.sortDir === 'asc'
        ? asc(sortColumn)
        : desc(sortColumn);

    const [totalRow] =
      await this.db
        .select({
          value: count(),
        })
        .from(
          programParticipants,
        )
        .innerJoin(
          users,
          eq(
            users.id,
            programParticipants.userId,
          ),
        )
        .where(where);

    const rows =
      await this.joined()
        .where(where)
        .orderBy(order)
        .limit(filter.limit)
        .offset(filter.offset);

    return {
      items: rows,
      total:
        totalRow?.value ?? 0,
    };
  }

  async findById(
    id: string,
  ): Promise<ParticipantRow | null> {
    const [row] =
      await this.joined()
        .where(
          eq(
            programParticipants.id,
            id,
          ),
        )
        .limit(1);

    return row ?? null;
  }

  async findActiveByUserAndProgram(
    userId: string,
    programId: string,
  ): Promise<ParticipantRow | null> {
    const [row] =
      await this.joined()
        .where(
          and(
            eq(
              programParticipants.userId,
              userId,
            ),
            eq(
              programParticipants.programId,
              programId,
            ),
            eq(
              programParticipants.status,
              'ACTIVE',
            ),
          ),
        )
        .limit(1);

    return row ?? null;
  }

  async insert(
    row: NewParticipant,
  ): Promise<void> {
    await this.db
      .insert(
        programParticipants,
      )
      .values({
        id: row.id,
        userId: row.userId,
        programId: row.programId,
        batchId: row.batchId,
        organizationId:
          row.organizationId,
        employeeId:
          row.employeeId,
        position:
          row.position,
        unit:
          row.unit,
        status:
          row.status,
        createdAt:
          row.createdAt,
        updatedAt:
          row.updatedAt,
      });
  }

  async update(
    id: string,
    patch: ParticipantPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      batchId?: string;
      position?: string;
      unit?: string;
      employeeId?: string;
    } = {
      updatedAt:
        patch.updatedAt,
    };

    if (
      patch.batchId !==
      undefined
    ) {
      values.batchId =
        patch.batchId;
    }

    if (
      patch.position !==
      undefined
    ) {
      values.position =
        patch.position;
    }

    if (
      patch.unit !==
      undefined
    ) {
      values.unit =
        patch.unit;
    }

    if (
      patch.employeeId !==
      undefined
    ) {
      values.employeeId =
        patch.employeeId;
    }

    await this.db
      .update(
        programParticipants,
      )
      .set(values)
      .where(
        eq(
          programParticipants.id,
          id,
        ),
      );
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(
        programParticipants,
      )
      .set({
        status,
        updatedAt,
      })
      .where(
        eq(
          programParticipants.id,
          id,
        ),
      );
  }

  async hasDependents(
    participantId: string,
  ): Promise<boolean> {
    const [relationCount] =
      await this.db
        .select({
          value: count(),
        })
        .from(
          evaluatorRelations,
        )
        .where(
          eq(
            evaluatorRelations
              .programParticipantId,
            participantId,
          ),
        );

    if (
      (relationCount?.value ?? 0) >
      0
    ) {
      return true;
    }

    const [targetCount] =
      await this.db
        .select({
          value: count(),
        })
        .from(
          participantAssessmentTargets,
        )
        .where(
          eq(
            participantAssessmentTargets
              .programParticipantId,
            participantId,
          ),
        );

    return (
      (targetCount?.value ?? 0) >
      0
    );
  }

  async countActiveRelationsBySubject(
    participantId: string,
  ): Promise<Record<string, number>> {
    const rows =
      await this.db
        .select({
          code:
            assessmentTypes.code,
          value: count(),
        })
        .from(
          evaluatorRelations,
        )
        .innerJoin(
          assessmentTypes,
          eq(
            assessmentTypes.id,
            evaluatorRelations
              .assessmentTypeId,
          ),
        )
        .where(
          and(
            eq(
              evaluatorRelations
                .programParticipantId,
              participantId,
            ),
            eq(
              evaluatorRelations.status,
              'ACTIVE',
            ),
          ),
        )
        .groupBy(
          assessmentTypes.code,
        );

    const result:
      Record<string, number> = {};

    for (const row of rows) {
      result[row.code] =
        Number(row.value);
    }

    return result;
  }
}

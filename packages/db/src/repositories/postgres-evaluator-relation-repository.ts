import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  alias,
} from 'drizzle-orm/pg-core';
import type {
  NewRelation,
  RelationListFilter,
  RelationRepositoryPort,
  RelationRow,
  ScopeFilter,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  assessmentTypes,
  evaluatorRelations,
  programParticipants,
  users,
} from '../schema/postgres-schema';

const subjectParticipant =
  alias(
    programParticipants,
    'subject_participant',
  );

const evaluatorParticipant =
  alias(
    programParticipants,
    'evaluator_participant',
  );

const subjectUser =
  alias(
    users,
    'subject_user',
  );

const evaluatorUser =
  alias(
    users,
    'evaluator_user',
  );

const ALWAYS_FALSE: SQL =
  sql`false`;

const relationSelect = {
  id:
    evaluatorRelations.id,
  programId:
    subjectParticipant.programId,
  assessmentType:
    assessmentTypes.code,
  assessmentTypeId:
    evaluatorRelations
      .assessmentTypeId,
  subjectParticipantId:
    evaluatorRelations
      .programParticipantId,
  subjectUserCode:
    subjectUser.userId,
  subjectName:
    subjectUser.fullName,
  subjectBatchId:
    subjectParticipant.batchId,
  subjectOrganizationId:
    subjectParticipant
      .organizationId,
  evaluatorUserId:
    evaluatorRelations
      .evaluatorUserId,
  evaluatorUserCode:
    evaluatorUser.userId,
  evaluatorName:
    evaluatorUser.fullName,
  evaluatorParticipantId:
    evaluatorParticipant.id,
  evaluatorBatchId:
    evaluatorParticipant.batchId,
  evaluatorOrganizationId:
    evaluatorParticipant
      .organizationId,
  status:
    evaluatorRelations.status,
};

function subjectScopeWhere(
  scope: ScopeFilter,
): SQL | undefined {
  if (scope.kind === 'all') {
    return undefined;
  }

  const usableRows =
    scope.rows.filter(
      (row) =>
        row.programId ||
        row.batchId ||
        row.organizationId,
    );

  if (
    usableRows.length === 0
  ) {
    return ALWAYS_FALSE;
  }

  const conditions =
    usableRows.map((row) => {
      const matches: SQL[] = [];

      if (row.programId) {
        matches.push(
          eq(
            subjectParticipant
              .programId,
            row.programId,
          ),
        );
      }

      if (row.batchId) {
        matches.push(
          eq(
            subjectParticipant
              .batchId,
            row.batchId,
          ),
        );
      }

      if (row.organizationId) {
        matches.push(
          eq(
            subjectParticipant
              .organizationId,
            row.organizationId,
          ),
        );
      }

      return (
        and(...matches) ??
        ALWAYS_FALSE
      );
    });

  return (
    or(...conditions) ??
    ALWAYS_FALSE
  );
}

export class PostgresEvaluatorRelationRepository
  implements RelationRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private joined() {
    return this.db
      .select(relationSelect)
      .from(
        evaluatorRelations,
      )
      .innerJoin(
        subjectParticipant,
        eq(
          subjectParticipant.id,
          evaluatorRelations
            .programParticipantId,
        ),
      )
      .innerJoin(
        subjectUser,
        eq(
          subjectUser.id,
          subjectParticipant.userId,
        ),
      )
      .innerJoin(
        assessmentTypes,
        eq(
          assessmentTypes.id,
          evaluatorRelations
            .assessmentTypeId,
        ),
      )
      .innerJoin(
        evaluatorUser,
        eq(
          evaluatorUser.id,
          evaluatorRelations
            .evaluatorUserId,
        ),
      )
      .leftJoin(
        evaluatorParticipant,
        and(
          eq(
            evaluatorParticipant
              .programId,
            subjectParticipant
              .programId,
          ),
          eq(
            evaluatorParticipant
              .userId,
            evaluatorRelations
              .evaluatorUserId,
          ),
          eq(
            evaluatorParticipant
              .status,
            'ACTIVE',
          ),
        ),
      );
  }

  async list(
    filter: RelationListFilter,
  ): Promise<{
    items: RelationRow[];
    total: number;
  }> {
    const conditions: SQL[] = [
      eq(
        subjectParticipant
          .programId,
        filter.programId,
      ),
    ];

    const scopeCondition =
      subjectScopeWhere(
        filter.scope,
      );

    if (scopeCondition) {
      conditions.push(
        scopeCondition,
      );
    }

    if (
      filter.assessmentType
    ) {
      conditions.push(
        eq(
          assessmentTypes.code,
          filter.assessmentType,
        ),
      );
    }

    if (
      filter.subjectBatchId
    ) {
      conditions.push(
        eq(
          subjectParticipant
            .batchId,
          filter.subjectBatchId,
        ),
      );
    }

    if (
      filter.evaluatorBatchId
    ) {
      conditions.push(
        eq(
          evaluatorParticipant
            .batchId,
          filter.evaluatorBatchId,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(
          evaluatorRelations.status,
          filter.status,
        ),
      );
    }

    if (filter.search) {
      const searchTerm =
        `%${filter.search}%`;

      const searchCondition = or(
        ilike(
          subjectUser.userId,
          searchTerm,
        ),
        ilike(
          subjectUser.fullName,
          searchTerm,
        ),
        ilike(
          evaluatorUser.userId,
          searchTerm,
        ),
        ilike(
          evaluatorUser.fullName,
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
      assessmentType:
        assessmentTypes.code,
      createdAt:
        evaluatorRelations.createdAt,
      status:
        evaluatorRelations.status,
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
          evaluatorRelations,
        )
        .innerJoin(
          subjectParticipant,
          eq(
            subjectParticipant.id,
            evaluatorRelations
              .programParticipantId,
          ),
        )
        .innerJoin(
          subjectUser,
          eq(
            subjectUser.id,
            subjectParticipant.userId,
          ),
        )
        .innerJoin(
          assessmentTypes,
          eq(
            assessmentTypes.id,
            evaluatorRelations
              .assessmentTypeId,
          ),
        )
        .innerJoin(
          evaluatorUser,
          eq(
            evaluatorUser.id,
            evaluatorRelations
              .evaluatorUserId,
          ),
        )
        .leftJoin(
          evaluatorParticipant,
          and(
            eq(
              evaluatorParticipant
                .programId,
              subjectParticipant
                .programId,
            ),
            eq(
              evaluatorParticipant
                .userId,
              evaluatorRelations
                .evaluatorUserId,
            ),
            eq(
              evaluatorParticipant
                .status,
              'ACTIVE',
            ),
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
  ): Promise<RelationRow | null> {
    const [row] =
      await this.joined()
        .where(
          eq(
            evaluatorRelations.id,
            id,
          ),
        )
        .limit(1);

    return row ?? null;
  }

  async findByTriple(
    programParticipantId: string,
    evaluatorUserId: string,
    assessmentTypeId: string,
  ): Promise<{
    id: string;
    status: string;
  } | null> {
    const [row] =
      await this.db
        .select({
          id:
            evaluatorRelations.id,
          status:
            evaluatorRelations.status,
        })
        .from(
          evaluatorRelations,
        )
        .where(
          and(
            eq(
              evaluatorRelations
                .programParticipantId,
              programParticipantId,
            ),
            eq(
              evaluatorRelations
                .evaluatorUserId,
              evaluatorUserId,
            ),
            eq(
              evaluatorRelations
                .assessmentTypeId,
              assessmentTypeId,
            ),
          ),
        )
        .limit(1);

    return row ?? null;
  }

  async insert(
    row: NewRelation,
  ): Promise<void> {
    await this.db
      .insert(
        evaluatorRelations,
      )
      .values({
        id:
          row.id,
        programParticipantId:
          row.programParticipantId,
        evaluatorUserId:
          row.evaluatorUserId,
        assessmentTypeId:
          row.assessmentTypeId,
        status:
          row.status,
        assignedAt:
          row.assignedAt,
        assignedBy:
          row.assignedBy,
        createdAt:
          row.createdAt,
        updatedAt:
          row.updatedAt,
      });
  }

  async setStatus(
    id: string,
    status: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(
        evaluatorRelations,
      )
      .set({
        status,
        updatedAt,
      })
      .where(
        eq(
          evaluatorRelations.id,
          id,
        ),
      );
  }

  async setType(
    id: string,
    assessmentTypeId: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(
        evaluatorRelations,
      )
      .set({
        assessmentTypeId,
        updatedAt,
      })
      .where(
        eq(
          evaluatorRelations.id,
          id,
        ),
      );
  }
}

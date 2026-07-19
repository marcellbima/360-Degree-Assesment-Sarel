import {
  eq,
} from 'drizzle-orm';
import type {
  NewParticipantTarget,
  ParticipantTargetRepositoryPort,
  ParticipantTargetRow,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  participantAssessmentTargets,
} from '../schema/postgres-schema';

export class PostgresParticipantTargetRepository
  implements ParticipantTargetRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async findByParticipant(
    participantId: string,
  ): Promise<
    ParticipantTargetRow[]
  > {
    return await this.db
      .select({
        assessmentTypeId:
          participantAssessmentTargets
            .assessmentTypeId,
        targetCount:
          participantAssessmentTargets
            .targetCount,
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
  }

  async replace(
    participantId: string,
    targets: NewParticipantTarget[],
  ): Promise<void> {
    await this.db.transaction(
      async (transaction) => {
        await transaction
          .delete(
            participantAssessmentTargets,
          )
          .where(
            eq(
              participantAssessmentTargets
                .programParticipantId,
              participantId,
            ),
          );

        if (
          targets.length === 0
        ) {
          return;
        }

        await transaction
          .insert(
            participantAssessmentTargets,
          )
          .values(
            targets.map(
              (target) => ({
                id: target.id,
                programParticipantId:
                  target
                    .programParticipantId,
                assessmentTypeId:
                  target
                    .assessmentTypeId,
                targetCount:
                  target.targetCount,
                createdAt:
                  target.createdAt,
                updatedAt:
                  target.updatedAt,
              }),
            ),
          );
      },
    );
  }
}

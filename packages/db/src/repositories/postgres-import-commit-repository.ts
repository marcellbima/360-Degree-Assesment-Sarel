import {
  eq,
  inArray,
} from 'drizzle-orm';
import type {
  ImportCommitRepositoryPort,
  NewParticipant,
  NewRelation,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  evaluatorRelations,
  importJobs,
  programParticipants,
} from '../schema/postgres-schema';

export class PostgresImportCommitRepository
  implements ImportCommitRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async commitParticipants(
    jobId: string,
    committedAt: string,
    participants: NewParticipant[],
  ): Promise<void> {
    await this.db.transaction(
      async (transaction) => {
        if (
          participants.length > 0
        ) {
          await transaction
            .insert(
              programParticipants,
            )
            .values(
              participants.map(
                (participant) => ({
                  id:
                    participant.id,
                  userId:
                    participant.userId,
                  programId:
                    participant.programId,
                  batchId:
                    participant.batchId,
                  organizationId:
                    participant
                      .organizationId,
                  employeeId:
                    participant.employeeId,
                  position:
                    participant.position,
                  unit:
                    participant.unit,
                  status:
                    participant.status,
                  createdAt:
                    participant.createdAt,
                  updatedAt:
                    participant.updatedAt,
                }),
              ),
            );
        }

        await transaction
          .update(importJobs)
          .set({
            status: 'COMMITTED',
            committedAt,
            updatedAt:
              committedAt,
          })
          .where(
            eq(
              importJobs.id,
              jobId,
            ),
          );
      },
    );
  }

  async commitEvaluators(
    jobId: string,
    committedAt: string,
    inserts: NewRelation[],
    reactivateIds: string[],
  ): Promise<void> {
    await this.db.transaction(
      async (transaction) => {
        if (inserts.length > 0) {
          await transaction
            .insert(
              evaluatorRelations,
            )
            .values(
              inserts.map(
                (relation) => ({
                  id:
                    relation.id,
                  programParticipantId:
                    relation
                      .programParticipantId,
                  evaluatorUserId:
                    relation
                      .evaluatorUserId,
                  assessmentTypeId:
                    relation
                      .assessmentTypeId,
                  status:
                    relation.status,
                  assignedAt:
                    relation.assignedAt,
                  assignedBy:
                    relation.assignedBy,
                  createdAt:
                    relation.createdAt,
                  updatedAt:
                    relation.updatedAt,
                }),
              ),
            );
        }

        if (
          reactivateIds.length > 0
        ) {
          await transaction
            .update(
              evaluatorRelations,
            )
            .set({
              status: 'ACTIVE',
              updatedAt:
                committedAt,
            })
            .where(
              inArray(
                evaluatorRelations.id,
                reactivateIds,
              ),
            );
        }

        await transaction
          .update(importJobs)
          .set({
            status: 'COMMITTED',
            committedAt,
            updatedAt:
              committedAt,
          })
          .where(
            eq(
              importJobs.id,
              jobId,
            ),
          );
      },
    );
  }
}

import { eq } from 'drizzle-orm';
import type {
  NewParticipantTarget,
  ParticipantTargetRepositoryPort,
  ParticipantTargetRow,
} from '@sarel/core';
import type { Db } from '../client';
import { participantAssessmentTargets } from '../schema/schema';

export class D1ParticipantTargetRepository implements ParticipantTargetRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async findByParticipant(participantId: string): Promise<ParticipantTargetRow[]> {
    return this.db
      .select({
        assessmentTypeId: participantAssessmentTargets.assessmentTypeId,
        targetCount: participantAssessmentTargets.targetCount,
      })
      .from(participantAssessmentTargets)
      .where(eq(participantAssessmentTargets.programParticipantId, participantId))
      .all();
  }

  async replace(participantId: string, targets: NewParticipantTarget[]): Promise<void> {
    const del = this.db
      .delete(participantAssessmentTargets)
      .where(eq(participantAssessmentTargets.programParticipantId, participantId));
    if (targets.length === 0) {
      await del.run();
      return;
    }
    const insert = this.db.insert(participantAssessmentTargets).values(
      targets.map((t) => ({
        id: t.id,
        programParticipantId: t.programParticipantId,
        assessmentTypeId: t.assessmentTypeId,
        targetCount: t.targetCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    );
    await this.db.batch([del, insert]);
  }
}

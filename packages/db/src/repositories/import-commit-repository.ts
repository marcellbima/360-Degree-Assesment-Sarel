import { eq } from 'drizzle-orm';
import type { ImportCommitRepositoryPort, NewParticipant, NewRelation } from '@sarel/core';
import type { Db } from '../client';
import { evaluatorRelations, importJobs, programParticipants } from '../schema/schema';

// Commit atomik via D1 batch: seluruh insert/update + perubahan status job
// COMMITTED dieksekusi dalam satu batch. Bila gagal, tidak ada yang tersimpan.
export class D1ImportCommitRepository implements ImportCommitRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async commitParticipants(
    jobId: string,
    committedAt: string,
    participants: NewParticipant[],
  ): Promise<void> {
    const jobUpdate = this.db
      .update(importJobs)
      .set({ status: 'COMMITTED', committedAt, updatedAt: committedAt })
      .where(eq(importJobs.id, jobId));
    const inserts = participants.map((p) =>
      this.db.insert(programParticipants).values({
        id: p.id,
        userId: p.userId,
        programId: p.programId,
        batchId: p.batchId,
        organizationId: p.organizationId,
        employeeId: p.employeeId,
        position: p.position,
        unit: p.unit,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }),
    );
    await this.db.batch([jobUpdate, ...inserts]);
  }

  async commitEvaluators(
    jobId: string,
    committedAt: string,
    inserts: NewRelation[],
    reactivateIds: string[],
  ): Promise<void> {
    const jobUpdate = this.db
      .update(importJobs)
      .set({ status: 'COMMITTED', committedAt, updatedAt: committedAt })
      .where(eq(importJobs.id, jobId));
    const insertStmts = inserts.map((r) =>
      this.db.insert(evaluatorRelations).values({
        id: r.id,
        programParticipantId: r.programParticipantId,
        evaluatorUserId: r.evaluatorUserId,
        assessmentTypeId: r.assessmentTypeId,
        status: r.status,
        assignedAt: r.assignedAt,
        assignedBy: r.assignedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }),
    );
    const reactivateStmts = reactivateIds.map((id) =>
      this.db
        .update(evaluatorRelations)
        .set({ status: 'ACTIVE', updatedAt: committedAt })
        .where(eq(evaluatorRelations.id, id)),
    );
    await this.db.batch([jobUpdate, ...insertStmts, ...reactivateStmts]);
  }
}

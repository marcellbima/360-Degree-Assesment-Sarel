import { and, eq, inArray } from 'drizzle-orm';
import {
  generateId,
  type AssessmentAssignmentFormVersionRef,
  type AssessmentAssignmentRepositoryPort,
  type AssessmentAssignmentSelection,
  type CreateAssessmentAssignmentGroupRepositoryInput,
  type ScopeFilter,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import {
  assessmentAssignmentGroups,
  assessmentAssignments,
  evaluatorRelations,
  programParticipants,
  publicFormVersions,
  users,
} from '../schema/postgres-schema';

interface ParticipantCandidate {
  id: string;
  userId: string;
  programId: string;
  batchId: string | null;
  organizationId: string | null;
}

interface AssignmentCandidate {
  participantId: string;
  evaluatorUserId: string;
  evaluatorRelationId: string | null;
}

function isParticipantWithinScope(participant: ParticipantCandidate, scope: ScopeFilter): boolean {
  if (scope.kind === 'all') {
    return true;
  }

  return scope.rows.some((row) => {
    const programMatches = row.programId === null || row.programId === participant.programId;

    const batchMatches = row.batchId === null || row.batchId === participant.batchId;

    const organizationMatches =
      row.organizationId === null || row.organizationId === participant.organizationId;

    return programMatches && batchMatches && organizationMatches;
  });
}

function filterSelectedParticipants(
  participants: ParticipantCandidate[],
  selection: AssessmentAssignmentSelection,
  scope: ScopeFilter,
): ParticipantCandidate[] {
  const participantIds =
    selection.mode === 'PARTICIPANTS' ? new Set(selection.participantIds) : null;

  const batchIds = selection.mode === 'BATCHES' ? new Set(selection.batchIds) : null;

  return participants.filter((participant) => {
    if (!isParticipantWithinScope(participant, scope)) {
      return false;
    }

    if (selection.mode === 'ALL_ACTIVE') {
      return true;
    }

    if (selection.mode === 'PARTICIPANTS') {
      return participantIds?.has(participant.id) ?? false;
    }

    if (participant.batchId === null) {
      return selection.includeWithoutBatch;
    }

    return batchIds?.has(participant.batchId) ?? false;
  });
}

export class PostgresAssessmentAssignmentRepository implements AssessmentAssignmentRepositoryPort {
  constructor(private readonly db: PostgresDatabase) {}

  async findPublicFormVersionById(id: string): Promise<AssessmentAssignmentFormVersionRef | null> {
    const rows = await this.db
      .select({
        id: publicFormVersions.id,
        publicFormId: publicFormVersions.publicFormId,
        versionNumber: publicFormVersions.versionNumber,
      })
      .from(publicFormVersions)
      .where(eq(publicFormVersions.id, id))
      .limit(1);

    return rows[0] ?? null;
  }

  async createGroup(input: CreateAssessmentAssignmentGroupRepositoryInput) {
    return this.db.transaction(async (transaction) => {
      const participantRows = await transaction
        .select({
          id: programParticipants.id,
          userId: programParticipants.userId,
          programId: programParticipants.programId,
          batchId: programParticipants.batchId,
          organizationId: programParticipants.organizationId,
        })
        .from(programParticipants)
        .innerJoin(users, eq(users.id, programParticipants.userId))
        .where(
          and(
            eq(programParticipants.programId, input.group.programId),
            eq(programParticipants.status, 'ACTIVE'),
            eq(users.status, 'ACTIVE'),
          ),
        );

      const selectedParticipants = filterSelectedParticipants(
        participantRows,
        input.selection,
        input.scope,
      );

      const selectedParticipantCount = selectedParticipants.length;

      if (selectedParticipantCount === 0) {
        return null;
      }

      const selectedParticipantIds = selectedParticipants.map((participant) => participant.id);

      let candidates: AssignmentCandidate[];

      let skippedNoRelationCount = 0;

      if (input.isSelf) {
        candidates = selectedParticipants.map((participant) => ({
          participantId: participant.id,
          evaluatorUserId: participant.userId,
          evaluatorRelationId: null,
        }));
      } else {
        const relationRows = await transaction
          .select({
            relationId: evaluatorRelations.id,
            participantId: evaluatorRelations.programParticipantId,
            evaluatorUserId: evaluatorRelations.evaluatorUserId,
          })
          .from(evaluatorRelations)
          .innerJoin(users, eq(users.id, evaluatorRelations.evaluatorUserId))
          .where(
            and(
              inArray(evaluatorRelations.programParticipantId, selectedParticipantIds),
              eq(evaluatorRelations.assessmentTypeId, input.group.assessmentTypeId),
              eq(evaluatorRelations.status, 'ACTIVE'),
              eq(users.status, 'ACTIVE'),
            ),
          );

        candidates = relationRows.map((relation) => ({
          participantId: relation.participantId,
          evaluatorUserId: relation.evaluatorUserId,
          evaluatorRelationId: relation.relationId,
        }));

        const subjectsWithRelation = new Set(
          relationRows.map((relation) => relation.participantId),
        );

        skippedNoRelationCount = selectedParticipants.filter(
          (participant) => !subjectsWithRelation.has(participant.id),
        ).length;
      }

      const candidateAssignmentCount = candidates.length;

      if (candidateAssignmentCount === 0) {
        return null;
      }

      await transaction.insert(assessmentAssignmentGroups).values({
        id: input.group.id,
        programId: input.group.programId,
        publicFormVersionId: input.group.publicFormVersionId,
        assessmentTypeId: input.group.assessmentTypeId,
        name: input.group.name,
        selectionMode: input.group.selectionMode,
        selectionSummary: {
          assessmentType: input.assessmentTypeCode,
          selection: input.selection,
          selectedParticipantCount,
          candidateAssignmentCount,
          skippedNoRelationCount,
        },
        status: input.group.status,
        availableFrom: input.group.availableFrom,
        dueAt: input.group.dueAt,
        createdBy: input.group.createdBy,
        createdAt: input.group.createdAt,
        updatedAt: input.group.updatedAt,
      });

      const assignmentRows = candidates.map((candidate) => ({
        id: generateId('asg'),
        assignmentGroupId: input.group.id,
        programParticipantId: candidate.participantId,
        evaluatorUserId: candidate.evaluatorUserId,
        assessmentTypeId: input.group.assessmentTypeId,
        publicFormVersionId: input.group.publicFormVersionId,
        evaluatorRelationId: candidate.evaluatorRelationId,
        questionnaireVersionId: null,
        status: input.assignmentStatus,
        assignedAt: input.group.createdAt,
        availableFrom: input.group.availableFrom,
        dueAt: input.group.dueAt,
        createdBy: input.group.createdBy,
        createdAt: input.group.createdAt,
        updatedAt: input.group.updatedAt,
      }));

      const insertedAssignments = await transaction
        .insert(assessmentAssignments)
        .values(assignmentRows)
        .onConflictDoNothing()
        .returning({
          id: assessmentAssignments.id,
        });

      const createdAssignmentCount = insertedAssignments.length;

      if (createdAssignmentCount === 0) {
        await transaction
          .delete(assessmentAssignmentGroups)
          .where(eq(assessmentAssignmentGroups.id, input.group.id));

        return null;
      }

      return {
        groupId: input.group.id,
        selectedParticipantCount,
        candidateAssignmentCount,
        createdAssignmentCount,
        skippedDuplicateCount: candidateAssignmentCount - createdAssignmentCount,
        skippedNoRelationCount,
      };
    });
  }
}

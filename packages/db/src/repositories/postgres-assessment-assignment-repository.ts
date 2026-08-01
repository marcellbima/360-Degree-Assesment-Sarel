import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import {
  generateId,
  type AssessmentAssignmentFormVersionListFilter,
  type AssessmentAssignmentFormVersionListItem,
  type AssessmentAssignmentFormVersionRef,
  type AssessmentAssignmentGroupListFilter,
  type AssessmentAssignmentGroupListItem,
  type AssessmentAssignmentRepositoryPort,
  type AssessmentAssignmentSelection,
  type AssessmentAssignmentTypeCode,
  type CreateAssessmentAssignmentGroupRepositoryInput,
  type PublicFormDefinition,
  type ScopeFilter,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import {
  assessmentAssignmentGroups,
  assessmentAssignments,
  assessmentTypes,
  evaluatorRelations,
  programParticipants,
  publicForms,
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

interface StoredAssignmentSelectionSummary {
  assessmentType?: AssessmentAssignmentTypeCode;
  selection?: AssessmentAssignmentSelection;
  selectedParticipantCount?: number;
  candidateAssignmentCount?: number;
  skippedNoRelationCount?: number;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function fallbackSelection(mode: string): AssessmentAssignmentSelection {
  if (mode === 'BATCHES') {
    return {
      mode: 'BATCHES',
      batchIds: [],
      includeWithoutBatch: false,
    };
  }

  if (mode === 'PARTICIPANTS') {
    return {
      mode: 'PARTICIPANTS',
      participantIds: [],
    };
  }

  return {
    mode: 'ALL_ACTIVE',
  };
}

export class PostgresAssessmentAssignmentRepository implements AssessmentAssignmentRepositoryPort {
  constructor(private readonly db: PostgresDatabase) {}

  async listPublicFormVersions(filter: AssessmentAssignmentFormVersionListFilter): Promise<{
    items: AssessmentAssignmentFormVersionListItem[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    if (filter.search) {
      const pattern = '%' + filter.search + '%';

      const searchCondition = or(
        ilike(publicForms.title, pattern),
        ilike(publicForms.slug, pattern),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({
        value: count(),
      })
      .from(publicFormVersions)
      .innerJoin(publicForms, eq(publicForms.id, publicFormVersions.publicFormId))
      .where(where);

    const rows = await this.db
      .select({
        id: publicFormVersions.id,
        publicFormId: publicFormVersions.publicFormId,
        formSlug: publicForms.slug,
        formTitle: publicForms.title,
        formDescription: publicForms.description,
        versionNumber: publicFormVersions.versionNumber,
        publishedAt: publicFormVersions.publishedAt,
        definition: publicFormVersions.definition,
      })
      .from(publicFormVersions)
      .innerJoin(publicForms, eq(publicForms.id, publicFormVersions.publicFormId))
      .where(where)
      .orderBy(asc(publicForms.title), desc(publicFormVersions.versionNumber))
      .limit(filter.limit)
      .offset(filter.offset);

    return {
      items: rows.map((row) => {
        const definition = row.definition as PublicFormDefinition;

        return {
          id: row.id,
          publicFormId: row.publicFormId,
          formSlug: row.formSlug,
          formTitle: row.formTitle,
          formDescription: row.formDescription,
          versionNumber: row.versionNumber,
          publishedAt: row.publishedAt,
          sectionCount: definition.sections.length,
          questionCount: definition.sections.reduce(
            (total, section) => total + section.questions.length,
            0,
          ),
        };
      }),
      total: numberValue(totalRow?.value),
    };
  }

  async listGroups(filter: AssessmentAssignmentGroupListFilter): Promise<{
    items: AssessmentAssignmentGroupListItem[];
    total: number;
  }> {
    const conditions: SQL[] = [eq(assessmentAssignmentGroups.programId, filter.programId)];

    if (filter.search) {
      const pattern = '%' + filter.search + '%';

      const searchCondition = or(
        ilike(assessmentAssignmentGroups.name, pattern),
        ilike(publicForms.title, pattern),
        ilike(publicForms.slug, pattern),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const where = and(...conditions);

    const [totalRow] = await this.db
      .select({
        value: count(),
      })
      .from(assessmentAssignmentGroups)
      .innerJoin(
        publicFormVersions,
        eq(publicFormVersions.id, assessmentAssignmentGroups.publicFormVersionId),
      )
      .innerJoin(publicForms, eq(publicForms.id, publicFormVersions.publicFormId))
      .innerJoin(
        assessmentTypes,
        eq(assessmentTypes.id, assessmentAssignmentGroups.assessmentTypeId),
      )
      .where(where);

    const rows = await this.db
      .select({
        id: assessmentAssignmentGroups.id,
        programId: assessmentAssignmentGroups.programId,
        publicFormId: publicFormVersions.publicFormId,
        publicFormVersionId: assessmentAssignmentGroups.publicFormVersionId,
        formSlug: publicForms.slug,
        formTitle: publicForms.title,
        versionNumber: publicFormVersions.versionNumber,
        assessmentType: assessmentTypes.code,
        name: assessmentAssignmentGroups.name,
        selectionMode: assessmentAssignmentGroups.selectionMode,
        selectionSummary: assessmentAssignmentGroups.selectionSummary,
        status: assessmentAssignmentGroups.status,
        availableFrom: assessmentAssignmentGroups.availableFrom,
        dueAt: assessmentAssignmentGroups.dueAt,
        createdAt: assessmentAssignmentGroups.createdAt,
      })
      .from(assessmentAssignmentGroups)
      .innerJoin(
        publicFormVersions,
        eq(publicFormVersions.id, assessmentAssignmentGroups.publicFormVersionId),
      )
      .innerJoin(publicForms, eq(publicForms.id, publicFormVersions.publicFormId))
      .innerJoin(
        assessmentTypes,
        eq(assessmentTypes.id, assessmentAssignmentGroups.assessmentTypeId),
      )
      .where(where)
      .orderBy(desc(assessmentAssignmentGroups.createdAt))
      .limit(filter.limit)
      .offset(filter.offset);

    const groupIds = rows.map((row) => row.id);

    const assignmentCounts = new Map<string, number>();

    if (groupIds.length > 0) {
      const countRows = await this.db
        .select({
          groupId: assessmentAssignments.assignmentGroupId,
          value: count(),
        })
        .from(assessmentAssignments)
        .where(inArray(assessmentAssignments.assignmentGroupId, groupIds))
        .groupBy(assessmentAssignments.assignmentGroupId);

      for (const row of countRows) {
        if (row.groupId) {
          assignmentCounts.set(row.groupId, numberValue(row.value));
        }
      }
    }

    return {
      items: rows.map((row) => {
        const summary = row.selectionSummary as StoredAssignmentSelectionSummary;

        const selection = summary.selection ?? fallbackSelection(row.selectionMode);

        const candidateAssignmentCount = numberValue(summary.candidateAssignmentCount);

        const createdAssignmentCount = assignmentCounts.get(row.id) ?? 0;

        return {
          id: row.id,
          programId: row.programId,
          publicFormId: row.publicFormId,
          publicFormVersionId: row.publicFormVersionId,
          formSlug: row.formSlug,
          formTitle: row.formTitle,
          versionNumber: row.versionNumber,
          assessmentType: row.assessmentType as AssessmentAssignmentTypeCode,
          name: row.name,
          selectionMode: row.selectionMode as AssessmentAssignmentSelection['mode'],
          selection,
          selectedParticipantCount: numberValue(summary.selectedParticipantCount),
          candidateAssignmentCount,
          createdAssignmentCount,
          skippedDuplicateCount: Math.max(0, candidateAssignmentCount - createdAssignmentCount),
          skippedNoRelationCount: numberValue(summary.skippedNoRelationCount),
          status: row.status,
          availableFrom: row.availableFrom,
          dueAt: row.dueAt,
          createdAt: row.createdAt,
        };
      }),
      total: numberValue(totalRow?.value),
    };
  }

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

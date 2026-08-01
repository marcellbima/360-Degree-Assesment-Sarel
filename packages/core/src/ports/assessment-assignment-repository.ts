import type { ScopeFilter } from '../admin/types';

export type AssessmentAssignmentTypeCode = 'SELF' | 'SUPERIOR' | 'PEER' | 'SUBORDINATE';

export type AssessmentAssignmentSelection =
  | {
      mode: 'ALL_ACTIVE';
    }
  | {
      mode: 'BATCHES';
      batchIds: string[];
      includeWithoutBatch: boolean;
    }
  | {
      mode: 'PARTICIPANTS';
      participantIds: string[];
    };

export interface AssessmentAssignmentFormVersionRef {
  id: string;
  publicFormId: string;
  versionNumber: number;
}

export interface NewAssessmentAssignmentGroup {
  id: string;
  programId: string;
  publicFormVersionId: string;
  assessmentTypeId: string;
  name: string;
  selectionMode: AssessmentAssignmentSelection['mode'];
  status: 'ACTIVE';
  availableFrom: string | null;
  dueAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type InitialAssessmentAssignmentStatus = 'ASSIGNED' | 'AVAILABLE';

export interface CreateAssessmentAssignmentGroupRepositoryInput {
  group: NewAssessmentAssignmentGroup;
  selection: AssessmentAssignmentSelection;
  assessmentTypeCode: AssessmentAssignmentTypeCode;
  isSelf: boolean;
  assignmentStatus: InitialAssessmentAssignmentStatus;
  scope: ScopeFilter;
}

export interface AssessmentAssignmentGroupCreateResult {
  groupId: string;
  selectedParticipantCount: number;
  candidateAssignmentCount: number;
  createdAssignmentCount: number;
  skippedDuplicateCount: number;
  skippedNoRelationCount: number;
}

export interface AssessmentAssignmentRepositoryPort {
  findPublicFormVersionById(id: string): Promise<AssessmentAssignmentFormVersionRef | null>;

  createGroup(
    input: CreateAssessmentAssignmentGroupRepositoryInput,
  ): Promise<AssessmentAssignmentGroupCreateResult | null>;
}

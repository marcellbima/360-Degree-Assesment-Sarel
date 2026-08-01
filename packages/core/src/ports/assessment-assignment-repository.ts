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

export interface AssessmentAssignmentFormVersionListFilter {
  search?: string;
  limit: number;
  offset: number;
}

export interface AssessmentAssignmentFormVersionListItem {
  id: string;
  publicFormId: string;
  formSlug: string;
  formTitle: string;
  formDescription: string | null;
  versionNumber: number;
  publishedAt: string;
  sectionCount: number;
  questionCount: number;
}

export interface AssessmentAssignmentGroupListFilter {
  programId: string;
  search?: string;
  limit: number;
  offset: number;
}

export interface AssessmentAssignmentGroupListItem {
  id: string;
  programId: string;
  publicFormId: string;
  publicFormVersionId: string;
  formSlug: string;
  formTitle: string;
  versionNumber: number;
  assessmentType: AssessmentAssignmentTypeCode;
  name: string;
  selectionMode: AssessmentAssignmentSelection['mode'];
  selection: AssessmentAssignmentSelection;
  selectedParticipantCount: number;
  candidateAssignmentCount: number;
  createdAssignmentCount: number;
  skippedDuplicateCount: number;
  skippedNoRelationCount: number;
  status: string;
  availableFrom: string | null;
  dueAt: string | null;
  createdAt: string;
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

  listPublicFormVersions(filter: AssessmentAssignmentFormVersionListFilter): Promise<{
    items: AssessmentAssignmentFormVersionListItem[];
    total: number;
  }>;

  listGroups(filter: AssessmentAssignmentGroupListFilter): Promise<{
    items: AssessmentAssignmentGroupListItem[];
    total: number;
  }>;

  createGroup(
    input: CreateAssessmentAssignmentGroupRepositoryInput,
  ): Promise<AssessmentAssignmentGroupCreateResult | null>;
}

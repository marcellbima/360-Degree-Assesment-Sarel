import type { Paginated } from '@sarel/shared';

import { apiQueryString, apiRequest } from './api';

export type AssessmentAssignmentType = 'SELF' | 'SUPERIOR' | 'PEER' | 'SUBORDINATE';

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

export interface AssessmentAssignmentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface AssessmentAssignmentFormVersion {
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

export interface AssessmentAssignmentGroup {
  id: string;
  programId: string;
  publicFormId: string;
  publicFormVersionId: string;
  formSlug: string;
  formTitle: string;
  versionNumber: number;
  assessmentType: AssessmentAssignmentType;
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

export interface CreateAssessmentAssignmentRequest {
  name: string;
  publicFormVersionId: string;
  assessmentType: AssessmentAssignmentType;
  selection: AssessmentAssignmentSelection;
  availableFrom?: string | null;
  dueAt?: string | null;
}

export interface CreateAssessmentAssignmentResult {
  groupId: string;
  programId: string;
  publicFormId: string;
  publicFormVersionId: string;
  versionNumber: number;
  assessmentType: AssessmentAssignmentType;
  name: string;
  selection: AssessmentAssignmentSelection;
  groupStatus: 'ACTIVE';
  assignmentStatus: 'ASSIGNED' | 'AVAILABLE';
  selectedParticipantCount: number;
  candidateAssignmentCount: number;
  createdAssignmentCount: number;
  skippedDuplicateCount: number;
  skippedNoRelationCount: number;
  availableFrom: string | null;
  dueAt: string | null;
  createdAt: string;
}

export function assessmentAssignmentGroupPath(programId: string): string {
  return `/api/admin/programs/${encodeURIComponent(programId)}/assessment-assignment-groups`;
}

export function assessmentAssignmentCreatePath(programId: string): string {
  return `/api/admin/programs/${encodeURIComponent(programId)}/assessment-assignments`;
}

export const assessmentAssignmentAdminApi = {
  listFormVersions(
    params: AssessmentAssignmentListParams = {},
  ): Promise<Paginated<AssessmentAssignmentFormVersion>> {
    return apiRequest(
      `/api/admin/public-form-versions${apiQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      })}`,
    );
  },

  listGroups(
    programId: string,
    params: AssessmentAssignmentListParams = {},
  ): Promise<Paginated<AssessmentAssignmentGroup>> {
    return apiRequest(
      `${assessmentAssignmentGroupPath(programId)}${apiQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
      })}`,
    );
  },

  create(
    programId: string,
    body: CreateAssessmentAssignmentRequest,
  ): Promise<CreateAssessmentAssignmentResult> {
    return apiRequest(assessmentAssignmentCreatePath(programId), {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

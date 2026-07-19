import type { ScopeFilter } from '../admin/types';

export interface RelationRow {
  id: string;
  programId: string;
  assessmentType: string;
  assessmentTypeId: string;
  subjectParticipantId: string;
  subjectUserCode: string;
  subjectName: string;
  subjectBatchId: string | null;
  subjectOrganizationId: string | null;
  evaluatorUserId: string;
  evaluatorUserCode: string;
  evaluatorName: string;
  evaluatorParticipantId: string | null;
  evaluatorBatchId: string | null;
  evaluatorOrganizationId: string | null;
  status: string;
}

export interface RelationListFilter {
  programId: string;
  search?: string;
  assessmentType?: string;
  subjectBatchId?: string;
  evaluatorBatchId?: string;
  status?: string;
  limit: number;
  offset: number;
  sortBy: 'assessmentType' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
  scope: ScopeFilter;
}

export interface NewRelation {
  id: string;
  programParticipantId: string;
  evaluatorUserId: string;
  assessmentTypeId: string;
  status: string;
  assignedAt: string | null;
  assignedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RelationRepositoryPort {
  list(filter: RelationListFilter): Promise<{ items: RelationRow[]; total: number }>;
  findById(id: string): Promise<RelationRow | null>;
  // Untuk deteksi duplikat / reactivation (lookup by triple, abaikan status).
  findByTriple(
    programParticipantId: string,
    evaluatorUserId: string,
    assessmentTypeId: string,
  ): Promise<{ id: string; status: string } | null>;
  insert(row: NewRelation): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
  setType(id: string, assessmentTypeId: string, updatedAt: string): Promise<void>;
}

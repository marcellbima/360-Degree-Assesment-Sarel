import type { ScopeFilter } from '../admin/types';

export interface ParticipantRow {
  id: string;
  userId: string; // users.id (PK internal)
  userCode: string; // users.user_id (User ID login)
  npk: string | null;
  fullName: string;
  email: string | null;
  programId: string;
  programCode: string;
  batchId: string | null;
  batchCode: string | null;
  organizationId: string | null;
  status: string;
}

export interface ParticipantListFilter {
  programId: string;
  search?: string;
  batchId?: string;
  withoutBatch?: boolean;
  status?: string;
  limit: number;
  offset: number;
  sortBy: 'userCode' | 'fullName' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
  scope: ScopeFilter;
}

export interface NewParticipant {
  id: string;
  userId: string;
  programId: string;
  batchId: string | null;
  organizationId: string | null;
  employeeId: string | null;
  position: string | null;
  unit: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantPatch {
  batchId?: string | null;
  position?: string;
  unit?: string;
  employeeId?: string;
  updatedAt: string;
}

export interface ParticipantRepositoryPort {
  list(filter: ParticipantListFilter): Promise<{ items: ParticipantRow[]; total: number }>;
  findById(id: string): Promise<ParticipantRow | null>;
  findActiveByUserAndProgram(userId: string, programId: string): Promise<ParticipantRow | null>;
  insert(row: NewParticipant): Promise<void>;
  update(id: string, patch: ParticipantPatch): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
  // Menghalangi perpindahan batch / mempengaruhi konsistensi: relation atau target.
  hasDependents(participantId: string): Promise<boolean>;
  // Jumlah relation aktif sebagai subject, dikelompokkan per kode assessment type.
  countActiveRelationsBySubject(participantId: string): Promise<Record<string, number>>;
}

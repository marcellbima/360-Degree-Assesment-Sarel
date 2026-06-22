import type { ScopeFilter } from '../admin/types';

export interface BatchRow {
  id: string;
  programId: string;
  code: string;
  name: string;
  description: string | null;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchListFilter {
  search?: string;
  status?: string;
  programId?: string;
  limit: number;
  offset: number;
  scope: ScopeFilter;
}

export interface NewBatch {
  id: string;
  programId: string;
  code: string;
  name: string;
  description: string | null;
  orderIndex: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface BatchPatch {
  code?: string;
  name?: string;
  description?: string | null;
  orderIndex?: number;
  startDate?: string | null;
  endDate?: string | null;
  updatedAt: string;
}

export interface BatchRepositoryPort {
  list(filter: BatchListFilter): Promise<{ items: BatchRow[]; total: number }>;
  findById(id: string): Promise<BatchRow | null>;
  findByProgramAndCode(programId: string, code: string): Promise<BatchRow | null>;
  insert(row: NewBatch): Promise<void>;
  update(id: string, patch: BatchPatch): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
}

import type { ScopeFilter } from '../admin/types';

export interface ProgramRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  organizationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramListFilter {
  search?: string;
  status?: string;
  organizationId?: string;
  limit: number;
  offset: number;
  scope: ScopeFilter;
}

export interface NewProgram {
  id: string;
  code: string;
  name: string;
  description: string | null;
  year: number | null;
  startDate: string | null;
  endDate: string | null;
  organizationId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface ProgramPatch {
  code?: string;
  name?: string;
  description?: string | null;
  year?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  organizationId?: string | null;
  updatedAt: string;
}

export interface ProgramRepositoryPort {
  list(filter: ProgramListFilter): Promise<{ items: ProgramRow[]; total: number }>;
  findById(id: string): Promise<ProgramRow | null>;
  findByCode(code: string): Promise<ProgramRow | null>;
  insert(row: NewProgram): Promise<void>;
  update(id: string, patch: ProgramPatch): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
}

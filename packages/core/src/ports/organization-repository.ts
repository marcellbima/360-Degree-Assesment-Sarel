import type { ScopeFilter } from '../admin/types';

export interface OrganizationRow {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationListFilter {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
  scope: ScopeFilter;
}

export interface NewOrganization {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationPatch {
  code?: string;
  name?: string;
  updatedAt: string;
}

export interface OrganizationRepositoryPort {
  list(filter: OrganizationListFilter): Promise<{ items: OrganizationRow[]; total: number }>;
  findById(id: string): Promise<OrganizationRow | null>;
  findByCode(code: string): Promise<OrganizationRow | null>;
  insert(row: NewOrganization): Promise<void>;
  update(id: string, patch: OrganizationPatch): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
}

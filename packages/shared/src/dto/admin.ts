// DTO administratif Phase 4. Tidak pernah memuat password hash, salt, atau token.

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminUserDto {
  id: string;
  userId: string;
  npk: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  unit: string | null;
  division: string | null;
  organizationId: string | null;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDto {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramDto {
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

export interface BatchDto {
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

export interface AdminScopeDto {
  id: string;
  organizationId: string | null;
  programId: string | null;
  batchId: string | null;
}

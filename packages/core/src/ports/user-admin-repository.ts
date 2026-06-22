import type { AdminScopeRow } from '../auth/admin-scope-policy';
import type { ScopeFilter } from '../admin/types';

export interface AdminUserRow {
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
  createdAt: string;
  updatedAt: string;
}

export interface UserListFilter {
  search?: string;
  status?: string;
  roleCode?: string;
  limit: number;
  offset: number;
  sortBy: 'userId' | 'fullName' | 'createdAt' | 'status';
  sortDir: 'asc' | 'desc';
  scope: ScopeFilter;
}

export interface NewUserRow {
  id: string;
  userId: string;
  fullName: string;
  passwordHash: string;
  npk: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  unit: string | null;
  division: string | null;
  organizationId: string | null;
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface UserPatch {
  fullName?: string;
  npk?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  unit?: string | null;
  division?: string | null;
  organizationId?: string | null;
  updatedAt: string;
}

export interface UserAdminRepositoryPort {
  list(filter: UserListFilter): Promise<{ items: AdminUserRow[]; total: number }>;
  findById(id: string): Promise<AdminUserRow | null>;
  existsByUserId(userId: string): Promise<boolean>;
  // Insert user + role assignment dalam satu transaksi.
  insert(row: NewUserRow, roleIds: string[]): Promise<void>;
  update(id: string, patch: UserPatch): Promise<void>;
  setStatus(id: string, status: string, updatedAt: string): Promise<void>;
  setPasswordHash(id: string, passwordHash: string, updatedAt: string): Promise<void>;
  getRoleCodes(id: string): Promise<string[]>;
  // Role per user untuk sekumpulan id (menghindari N+1 saat list).
  getRoleCodesForUsers(ids: string[]): Promise<Record<string, string[]>>;
  // Replace seluruh role user dalam satu transaksi.
  replaceRoles(id: string, roleIds: string[]): Promise<void>;
  countActiveSuperadmins(): Promise<number>;
  // Membuktikan USER berada dalam scope ADMIN melalui relasi database (program_participants).
  isUserInScope(targetUserId: string, scopes: AdminScopeRow[]): Promise<boolean>;
}

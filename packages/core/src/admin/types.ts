import type { Paginated } from '@sarel/shared';
import type { AdminScopeRow } from '../auth/admin-scope-policy';

// Aktor administratif (principal yang melakukan operasi).
export interface AdminActor {
  id: string;
  userId: string;
  roles: string[];
}

// Konteks request untuk audit log.
export interface AdminContext {
  actor: AdminActor;
  ip: string;
  userAgent: string | null;
  requestId: string | null;
}

// Filter scope untuk query daftar. SUPERADMIN = all; ADMIN = scoped rows.
// Tidak ada fallback global untuk ADMIN: rows kosong berarti tidak melihat apa pun.
export type ScopeFilter = { kind: 'all' } | { kind: 'scoped'; rows: AdminScopeRow[] };

// Membentuk filter scope dari principal dan scope rows yang sudah dimuat backend.
export function scopeFilterFor(roles: string[], rows: AdminScopeRow[]): ScopeFilter {
  if (roles.includes('SUPERADMIN')) {
    return { kind: 'all' };
  }
  return { kind: 'scoped', rows };
}

export function buildPage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export function offsetOf(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

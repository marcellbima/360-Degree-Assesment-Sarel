import { SUPERADMIN_ROLE } from '../auth/rbac';

export const MANAGEABLE_ROLES = ['SUPERADMIN', 'ADMIN', 'USER'] as const;

// Role mana yang boleh ditetapkan/dicabut oleh aktor.
// - role SUPERADMIN dan ADMIN hanya boleh dikelola oleh SUPERADMIN.
// - role USER boleh dikelola oleh SUPERADMIN atau ADMIN (ADMIN tetap dibatasi scope di lapisan lain).
export function canManageRole(actorRoles: string[], targetRole: string): boolean {
  const isSuper = actorRoles.includes(SUPERADMIN_ROLE);
  if (targetRole === 'SUPERADMIN' || targetRole === 'ADMIN') {
    return isSuper;
  }
  if (targetRole === 'USER') {
    return isSuper || actorRoles.includes('ADMIN');
  }
  return false;
}

// Role yang berubah antara set lama dan baru (ditambah atau dicabut).
export function changedRoles(oldRoles: string[], newRoles: string[]): string[] {
  const oldSet = new Set(oldRoles);
  const newSet = new Set(newRoles);
  const changed = new Set<string>();
  for (const r of oldRoles) if (!newSet.has(r)) changed.add(r);
  for (const r of newRoles) if (!oldSet.has(r)) changed.add(r);
  return [...changed];
}

// Perubahan role mengurangi hak akses bila ada role lama yang hilang.
export function isAccessReduced(oldRoles: string[], newRoles: string[]): boolean {
  const newSet = new Set(newRoles);
  return oldRoles.some((r) => !newSet.has(r));
}

// Normalisasi: hilangkan duplikat, pertahankan urutan deterministik.
export function normalizeRoles(roles: string[]): string[] {
  return [...new Set(roles)].sort();
}

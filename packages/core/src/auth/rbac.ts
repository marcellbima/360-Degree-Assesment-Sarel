// Pemeriksaan RBAC murni. Sumber kebenaran ada di backend.
// SUPERADMIN diperlakukan sebagai wildcard permission.

export const SUPERADMIN_ROLE = 'SUPERADMIN';

interface PrincipalLike {
  roles: string[];
  permissions: string[];
}

export function hasRole(roles: string[], role: string): boolean {
  return roles.includes(role);
}

export function hasAnyRole(roles: string[], required: string[]): boolean {
  return required.some((role) => roles.includes(role));
}

export function hasPermission(principal: PrincipalLike, permission: string): boolean {
  if (principal.roles.includes(SUPERADMIN_ROLE)) {
    return true;
  }
  return principal.permissions.includes(permission);
}

export function hasAllPermissions(principal: PrincipalLike, permissions: string[]): boolean {
  return permissions.every((permission) => hasPermission(principal, permission));
}

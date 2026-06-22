import { describe, expect, it } from 'vitest';
import { hasAllPermissions, hasAnyRole, hasPermission, hasRole } from './rbac';

describe('rbac', () => {
  it('hasRole dan hasAnyRole', () => {
    expect(hasRole(['ADMIN'], 'ADMIN')).toBe(true);
    expect(hasRole(['ADMIN'], 'USER')).toBe(false);
    expect(hasAnyRole(['USER'], ['ADMIN', 'USER'])).toBe(true);
    expect(hasAnyRole(['USER'], ['ADMIN'])).toBe(false);
  });

  it('hasPermission mengecek permission eksplisit', () => {
    const admin = { roles: ['ADMIN'], permissions: ['user.read'] };
    expect(hasPermission(admin, 'user.read')).toBe(true);
    expect(hasPermission(admin, 'user.delete')).toBe(false);
  });

  it('SUPERADMIN adalah wildcard permission', () => {
    const sa = { roles: ['SUPERADMIN'], permissions: [] };
    expect(hasPermission(sa, 'apa.saja')).toBe(true);
  });

  it('hasAllPermissions membutuhkan seluruh permission', () => {
    const admin = { roles: ['ADMIN'], permissions: ['user.read', 'batch.read'] };
    expect(hasAllPermissions(admin, ['user.read', 'batch.read'])).toBe(true);
    expect(hasAllPermissions(admin, ['user.read', 'user.delete'])).toBe(false);
  });
});

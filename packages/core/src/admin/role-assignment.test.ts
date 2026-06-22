import { describe, expect, it } from 'vitest';
import {
  canManageRole,
  changedRoles,
  isAccessReduced,
  normalizeRoles,
} from './role-assignment';

describe('role-assignment policy', () => {
  it('hanya SUPERADMIN dapat mengelola role SUPERADMIN dan ADMIN', () => {
    expect(canManageRole(['SUPERADMIN'], 'SUPERADMIN')).toBe(true);
    expect(canManageRole(['SUPERADMIN'], 'ADMIN')).toBe(true);
    expect(canManageRole(['ADMIN'], 'SUPERADMIN')).toBe(false);
    expect(canManageRole(['ADMIN'], 'ADMIN')).toBe(false);
  });

  it('USER dapat dikelola oleh ADMIN atau SUPERADMIN', () => {
    expect(canManageRole(['ADMIN'], 'USER')).toBe(true);
    expect(canManageRole(['SUPERADMIN'], 'USER')).toBe(true);
    expect(canManageRole(['USER'], 'USER')).toBe(false);
  });

  it('changedRoles menemukan penambahan dan pencabutan', () => {
    expect(changedRoles(['USER'], ['USER', 'ADMIN']).sort()).toEqual(['ADMIN']);
    expect(changedRoles(['ADMIN', 'USER'], ['USER']).sort()).toEqual(['ADMIN']);
    expect(changedRoles(['USER'], ['USER'])).toEqual([]);
  });

  it('isAccessReduced true bila role lama hilang', () => {
    expect(isAccessReduced(['ADMIN', 'USER'], ['USER'])).toBe(true);
    expect(isAccessReduced(['USER'], ['USER', 'ADMIN'])).toBe(false);
  });

  it('normalizeRoles menghapus duplikat', () => {
    expect(normalizeRoles(['USER', 'USER', 'ADMIN'])).toEqual(['ADMIN', 'USER']);
  });
});

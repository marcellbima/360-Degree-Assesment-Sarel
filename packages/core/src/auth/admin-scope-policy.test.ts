import { describe, expect, it } from 'vitest';
import {
  ScopeValidationError,
  assertValidScopeRow,
  isWithinScope,
  type AdminScopeRow,
  type ScopeTarget,
} from './admin-scope-policy';

const target: ScopeTarget = {
  programId: 'prog_1',
  batchId: 'batch_1',
  organizationId: 'org_1',
};

describe('assertValidScopeRow', () => {
  it('menolak baris dengan seluruh kolom null', () => {
    expect(() =>
      assertValidScopeRow({ programId: null, batchId: null, organizationId: null }),
    ).toThrow(ScopeValidationError);
  });

  it('menerima baris dengan program saja', () => {
    expect(() =>
      assertValidScopeRow({ programId: 'prog_1', batchId: null, organizationId: null }),
    ).not.toThrow();
  });

  it('menolak batch yang tidak berasal dari program pada baris yang sama', () => {
    expect(() =>
      assertValidScopeRow(
        { programId: 'prog_1', batchId: 'batch_1', organizationId: null },
        { batchProgramId: 'prog_lain' },
      ),
    ).toThrow(ScopeValidationError);
  });
});

describe('isWithinScope', () => {
  it('SUPERADMIN melihat seluruh data tanpa scope', () => {
    expect(isWithinScope(['SUPERADMIN'], [], target)).toBe(true);
  });

  it('ADMIN tanpa scope tidak melihat apa pun', () => {
    expect(isWithinScope(['ADMIN'], [], target)).toBe(false);
  });

  it('scope program saja mencakup seluruh batch dalam program', () => {
    const scopes: AdminScopeRow[] = [
      { programId: 'prog_1', batchId: null, organizationId: null },
    ];
    expect(isWithinScope(['ADMIN'], scopes, target)).toBe(true);
    expect(
      isWithinScope(['ADMIN'], scopes, { ...target, batchId: 'batch_lain' }),
    ).toBe(true);
  });

  it('scope program berbeda tidak cocok', () => {
    const scopes: AdminScopeRow[] = [
      { programId: 'prog_lain', batchId: null, organizationId: null },
    ];
    expect(isWithinScope(['ADMIN'], scopes, target)).toBe(false);
  });

  it('scope program+batch hanya mencakup batch tersebut', () => {
    const scopes: AdminScopeRow[] = [
      { programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ];
    expect(isWithinScope(['ADMIN'], scopes, target)).toBe(true);
    expect(
      isWithinScope(['ADMIN'], scopes, { ...target, batchId: 'batch_2' }),
    ).toBe(false);
  });

  it('organization menambahkan pembatasan pada baris', () => {
    const scopes: AdminScopeRow[] = [
      { programId: 'prog_1', batchId: null, organizationId: 'org_1' },
    ];
    expect(isWithinScope(['ADMIN'], scopes, target)).toBe(true);
    expect(
      isWithinScope(['ADMIN'], scopes, { ...target, organizationId: 'org_2' }),
    ).toBe(false);
  });

  it('beberapa baris digabung dengan OR', () => {
    const scopes: AdminScopeRow[] = [
      { programId: 'prog_lain', batchId: null, organizationId: null },
      { programId: 'prog_1', batchId: null, organizationId: null },
    ];
    expect(isWithinScope(['ADMIN'], scopes, target)).toBe(true);
  });
});

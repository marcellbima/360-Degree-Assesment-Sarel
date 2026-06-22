import { describe, expect, it } from 'vitest';
import { ScopeValidationError, assertValidScopeRow, scopeKey } from './admin-scope-policy';

describe('assertValidScopeRow consistency (Phase 4)', () => {
  it('menolak program yang tidak berasal dari organization pada baris', () => {
    expect(() =>
      assertValidScopeRow(
        { programId: 'prog_1', batchId: null, organizationId: 'org_2' },
        { programOrganizationId: 'org_1' },
      ),
    ).toThrow(ScopeValidationError);
  });

  it('menerima program yang konsisten dengan organization', () => {
    expect(() =>
      assertValidScopeRow(
        { programId: 'prog_1', batchId: null, organizationId: 'org_1' },
        { programOrganizationId: 'org_1' },
      ),
    ).not.toThrow();
  });

  it('menolak batch yang tidak konsisten dengan organization', () => {
    expect(() =>
      assertValidScopeRow(
        { programId: null, batchId: 'batch_1', organizationId: 'org_2' },
        { batchOrganizationId: 'org_1' },
      ),
    ).toThrow(ScopeValidationError);
  });

  it('scopeKey deterministik untuk dedupe', () => {
    expect(scopeKey({ organizationId: 'o', programId: 'p', batchId: null })).toBe('o|p|');
    expect(scopeKey({ organizationId: null, programId: null, batchId: 'b' })).toBe('||b');
  });
});

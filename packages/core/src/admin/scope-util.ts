import type { AdminScopeRepositoryPort } from '../ports/admin-scope-repository';
import type { AdminScopeRow } from '../auth/admin-scope-policy';
import { scopeFilterFor, type AdminContext, type ScopeFilter } from './types';

// Memuat filter scope dari principal. SUPERADMIN tidak dibatasi; ADMIN memuat
// baris scope dari backend (tanpa fallback global).
export async function loadScopeFilter(
  scopes: AdminScopeRepositoryPort,
  ctx: AdminContext,
): Promise<ScopeFilter> {
  if (ctx.actor.roles.includes('SUPERADMIN')) {
    return scopeFilterFor(ctx.actor.roles, []);
  }
  const recs = await scopes.findByAdminUserId(ctx.actor.id);
  const rows: AdminScopeRow[] = recs.map((r) => ({
    programId: r.programId,
    batchId: r.batchId,
    organizationId: r.organizationId,
  }));
  return scopeFilterFor(ctx.actor.roles, rows);
}

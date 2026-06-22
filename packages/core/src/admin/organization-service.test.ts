import { describe, expect, it } from 'vitest';
import { OrganizationService } from './organization-service';
import {
  FakeAdminScopeRepository,
  FakeOrganizationRepository,
  MutableClock,
  makeAuditWriter,
} from './fakes';
import type { AdminContext } from './types';

const SUPER: AdminContext = {
  actor: { id: 'sa', userId: 'sa', roles: ['SUPERADMIN'] },
  ip: '127.0.0.1',
  userAgent: null,
  requestId: 'req',
};
function adminCtx(id: string): AdminContext {
  return { actor: { id, userId: 'admin', roles: ['ADMIN'] }, ip: '127.0.0.1', userAgent: null, requestId: 'r' };
}

function setup() {
  const clock = new MutableClock();
  const repo = new FakeOrganizationRepository();
  const scopes = new FakeAdminScopeRepository();
  const { writer, repo: audit } = makeAuditWriter(clock);
  return { svc: new OrganizationService(repo, scopes, clock, writer), repo, scopes, audit };
}

describe('OrganizationService', () => {
  it('create organization sukses + audit', async () => {
    const { svc, audit } = setup();
    const dto = await svc.create({ code: 'ORG1', name: 'Organisasi 1' }, SUPER);
    expect(dto.code).toBe('ORG1');
    expect(dto.status).toBe('ACTIVE');
    expect(audit.actions()).toContain('ORGANIZATION_CREATED');
  });

  it('kode duplikat menghasilkan 409', async () => {
    const { svc } = setup();
    await svc.create({ code: 'ORG1', name: 'A' }, SUPER);
    await expect(svc.create({ code: 'ORG1', name: 'B' }, SUPER)).rejects.toMatchObject({
      httpStatus: 409,
    });
  });

  it('archive mengubah status dan mencatat audit', async () => {
    const { svc, audit } = setup();
    const created = await svc.create({ code: 'ORG1', name: 'A' }, SUPER);
    const archived = await svc.setArchived(created.id, true, SUPER);
    expect(archived.status).toBe('ARCHIVED');
    expect(audit.actions()).toContain('ORGANIZATION_ARCHIVED');
  });

  it('ADMIN scoped hanya melihat organization dalam scope', async () => {
    const { svc, repo, scopes } = setup();
    repo.seed({ id: 'org_1', code: 'O1', name: 'O1', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    repo.seed({ id: 'org_2', code: 'O2', name: 'O2', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    scopes.byAdmin.set('admin_x', [
      { id: 's', adminUserId: 'admin_x', programId: null, batchId: null, organizationId: 'org_1' },
    ]);
    const page = await svc.list({ page: 1, pageSize: 20 }, adminCtx('admin_x'));
    expect(page.items.map((o) => o.id)).toEqual(['org_1']);
  });

  it('ADMIN update organization dalam scope sukses, di luar scope 403', async () => {
    const { svc, repo, scopes } = setup();
    repo.seed({ id: 'org_1', code: 'O1', name: 'O1', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    repo.seed({ id: 'org_2', code: 'O2', name: 'O2', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    scopes.byAdmin.set('admin_x', [
      { id: 's', adminUserId: 'admin_x', programId: null, batchId: null, organizationId: 'org_1' },
    ]);
    const ok = await svc.update('org_1', { name: 'Baru' }, adminCtx('admin_x'));
    expect(ok.name).toBe('Baru');
    await expect(svc.update('org_2', { name: 'X' }, adminCtx('admin_x'))).rejects.toMatchObject({
      httpStatus: 403,
    });
  });
});

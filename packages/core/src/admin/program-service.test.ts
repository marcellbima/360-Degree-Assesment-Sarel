import { describe, expect, it } from 'vitest';
import { ProgramService } from './program-service';
import {
  FakeAdminScopeRepository,
  FakeOrganizationRepository,
  FakeProgramRepository,
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
  const programs = new FakeProgramRepository();
  const organizations = new FakeOrganizationRepository();
  const scopes = new FakeAdminScopeRepository();
  const { writer } = makeAuditWriter(clock);
  return {
    svc: new ProgramService(programs, organizations, scopes, clock, writer),
    programs,
    organizations,
    scopes,
  };
}

describe('ProgramService', () => {
  it('create sukses', async () => {
    const { svc } = setup();
    const dto = await svc.create({ code: 'P1', name: 'Program 1' }, SUPER);
    expect(dto.code).toBe('P1');
    expect(dto.status).toBe('ACTIVE');
  });

  it('tanggal mulai setelah selesai ditolak 400', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ code: 'P1', name: 'P', startDate: '2026-02-01', endDate: '2026-01-01' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('organization_id tidak valid ditolak 400', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ code: 'P1', name: 'P', organizationId: 'org_tidak_ada' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('kode duplikat 409', async () => {
    const { svc } = setup();
    await svc.create({ code: 'P1', name: 'A' }, SUPER);
    await expect(svc.create({ code: 'P1', name: 'B' }, SUPER)).rejects.toMatchObject({
      httpStatus: 409,
    });
  });

  it('ADMIN scoped hanya melihat program dalam scope', async () => {
    const { svc, programs, scopes } = setup();
    const base = { description: null, year: null, startDate: null, endDate: null, status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' };
    programs.seed({ id: 'prog_1', code: 'P1', name: 'P1', organizationId: 'org_1', ...base });
    programs.seed({ id: 'prog_2', code: 'P2', name: 'P2', organizationId: 'org_2', ...base });
    scopes.byAdmin.set('admin_x', [
      { id: 's', adminUserId: 'admin_x', programId: 'prog_1', batchId: null, organizationId: null },
    ]);
    const page = await svc.list({ page: 1, pageSize: 20 }, adminCtx('admin_x'));
    expect(page.items.map((p) => p.id)).toEqual(['prog_1']);
  });

  it('ADMIN create program dalam organization scope sukses, di luar scope 403', async () => {
    const { svc, organizations, scopes } = setup();
    organizations.seed({ id: 'org_1', code: 'O1', name: 'O1', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    organizations.seed({ id: 'org_2', code: 'O2', name: 'O2', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    scopes.byAdmin.set('admin_x', [
      { id: 's', adminUserId: 'admin_x', programId: null, batchId: null, organizationId: 'org_1' },
    ]);
    const ok = await svc.create({ code: 'P1', name: 'P1', organizationId: 'org_1' }, adminCtx('admin_x'));
    expect(ok.organizationId).toBe('org_1');
    await expect(
      svc.create({ code: 'P2', name: 'P2', organizationId: 'org_2' }, adminCtx('admin_x')),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });
});

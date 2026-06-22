import { describe, expect, it } from 'vitest';
import { AdminScopeService } from './admin-scope-service';
import {
  FakeAdminScopeRepository,
  FakeBatchRepository,
  FakeOrganizationRepository,
  FakeProgramRepository,
  FakeSessionAdminRepository,
  FakeUserAdminRepository,
  MutableClock,
  makeAuditWriter,
} from './fakes';
import type { ProgramRow } from '../ports/program-repository';
import type { BatchRow } from '../ports/batch-repository';
import type { OrganizationRow } from '../ports/organization-repository';
import type { AdminContext } from './types';

const SUPER: AdminContext = {
  actor: { id: 'sa', userId: 'sa', roles: ['SUPERADMIN'] },
  ip: '127.0.0.1',
  userAgent: null,
  requestId: 'req',
};

function org(id: string): OrganizationRow {
  return { id, code: id, name: id, status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' };
}
function program(id: string, organizationId: string | null): ProgramRow {
  return {
    id,
    code: id,
    name: id,
    description: null,
    year: null,
    startDate: null,
    endDate: null,
    organizationId,
    status: 'ACTIVE',
    createdAt: 'x',
    updatedAt: 'x',
  };
}
function batch(id: string, programId: string): BatchRow {
  return {
    id,
    programId,
    code: id,
    name: id,
    description: null,
    orderIndex: 0,
    startDate: null,
    endDate: null,
    status: 'ACTIVE',
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function setup() {
  const clock = new MutableClock();
  const users = new FakeUserAdminRepository();
  const organizations = new FakeOrganizationRepository();
  const programs = new FakeProgramRepository();
  const batches = new FakeBatchRepository();
  const scopes = new FakeAdminScopeRepository();
  const sessions = new FakeSessionAdminRepository();
  const { writer, repo: audit } = makeAuditWriter(clock);
  users.seed({ id: 'admin_1', userId: 'admin1', status: 'ACTIVE' }, ['ADMIN']);
  users.seed({ id: 'user_1', userId: 'user1', status: 'ACTIVE' }, ['USER']);
  const svc = new AdminScopeService({
    scopes,
    users,
    organizations,
    programs,
    batches,
    sessions,
    clock,
    audit: writer,
  });
  return { svc, organizations, programs, batches, scopes, sessions, audit };
}

describe('AdminScopeService', () => {
  it('target bukan ADMIN ditolak 409', async () => {
    const { svc } = setup();
    await expect(svc.replaceScopes('user_1', [], SUPER)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('replace scopes sukses, mencabut session, audit', async () => {
    const { svc, organizations, sessions, audit, scopes } = setup();
    organizations.seed(org('org_1'));
    const result = await svc.replaceScopes('admin_1', [{ organizationId: 'org_1' }], SUPER);
    expect(result).toHaveLength(1);
    expect(result[0].organizationId).toBe('org_1');
    expect(sessions.revokedFor).toContain('admin_1');
    expect(audit.actions()).toContain('ADMIN_SCOPES_CHANGED');
    expect(await scopes.findByAdminUserId('admin_1')).toHaveLength(1);
  });

  it('scope dengan seluruh field null ditolak 400', async () => {
    const { svc } = setup();
    await expect(svc.replaceScopes('admin_1', [{}], SUPER)).rejects.toMatchObject({
      httpStatus: 400,
    });
  });

  it('program tidak berasal dari organization ditolak 400', async () => {
    const { svc, organizations, programs } = setup();
    organizations.seed(org('org_1'));
    organizations.seed(org('org_2'));
    programs.seed(program('prog_1', 'org_1'));
    await expect(
      svc.replaceScopes('admin_1', [{ programId: 'prog_1', organizationId: 'org_2' }], SUPER),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('batch tidak berasal dari program ditolak 400', async () => {
    const { svc, programs, batches } = setup();
    programs.seed(program('prog_1', null));
    programs.seed(program('prog_2', null));
    batches.seed(batch('batch_2', 'prog_2'));
    await expect(
      svc.replaceScopes('admin_1', [{ programId: 'prog_1', batchId: 'batch_2' }], SUPER),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('scope duplikat dinormalisasi (dedupe deterministik)', async () => {
    const { svc, organizations } = setup();
    organizations.seed(org('org_1'));
    const result = await svc.replaceScopes(
      'admin_1',
      [{ organizationId: 'org_1' }, { organizationId: 'org_1' }],
      SUPER,
    );
    expect(result).toHaveLength(1);
  });
});

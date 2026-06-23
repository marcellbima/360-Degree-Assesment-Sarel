import { describe, expect, it } from 'vitest';
import { PasswordService } from '../auth/password-service';
import { UserAdminService } from './user-admin-service';
import {
  FakeAdminScopeRepository,
  FakeRoleRepository,
  FakeSessionAdminRepository,
  FakeUserAdminRepository,
  MutableClock,
  makeAuditWriter,
} from './fakes';
import type { AdminContext } from './types';

function ctx(roles: string[], id = 'user_actor'): AdminContext {
  return {
    actor: { id, userId: 'actor', roles, permissions: [] },
    ip: '127.0.0.1',
    userAgent: null,
    requestId: 'req',
  };
}
const SUPER = ctx(['SUPERADMIN']);
const ADMIN = ctx(['ADMIN'], 'user_admin');

function setup() {
  const clock = new MutableClock();
  const users = new FakeUserAdminRepository();
  const sessions = new FakeSessionAdminRepository();
  const scopes = new FakeAdminScopeRepository();
  const { writer, repo } = makeAuditWriter(clock);
  const svc = new UserAdminService({
    users,
    roles: new FakeRoleRepository(),
    sessions,
    scopes,
    passwords: new PasswordService('pepper-test', 10_000),
    clock,
    audit: writer,
  });
  return { svc, users, sessions, audit: repo };
}

describe('UserAdminService', () => {
  it('create user: sukses, tanpa field rahasia, audit USER_CREATED', async () => {
    const { svc, audit } = setup();
    const dto = await svc.create(
      { userId: 'budi', fullName: 'Budi', password: 'Rahasia123', roles: ['USER'] },
      SUPER,
    );
    expect(dto.userId).toBe('budi');
    expect(dto.roles).toEqual(['USER']);
    expect(dto.mustChangePassword).toBe(true);
    expect(Object.keys(dto)).not.toContain('passwordHash');
    expect(audit.actions()).toContain('USER_CREATED');
  });

  it('create user: User ID duplikat menghasilkan 409', async () => {
    const { svc } = setup();
    await svc.create({ userId: 'budi', fullName: 'Budi', password: 'Rahasia123' }, SUPER);
    await expect(
      svc.create({ userId: 'budi', fullName: 'Lain', password: 'Rahasia123' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('create user: password lemah ditolak 400', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ userId: 'budi', fullName: 'Budi', password: 'password' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it('ADMIN tidak dapat memberi role SUPERADMIN (403)', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ userId: 'x', fullName: 'X', password: 'Rahasia123', roles: ['SUPERADMIN'] }, ADMIN),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });

  it('perubahan role yang mengurangi akses mencabut session', async () => {
    const { svc, users, sessions, audit } = setup();
    users.seed({ id: 'u1', userId: 'u1', status: 'ACTIVE' }, ['ADMIN', 'USER']);
    sessions.setActive('u1', 2);
    await svc.setRoles('u1', ['USER'], SUPER);
    expect(sessions.revokedFor).toContain('u1');
    expect(audit.actions()).toContain('USER_ROLES_CHANGED');
    expect(audit.actions()).toContain('USER_SESSIONS_REVOKED');
  });

  it('melindungi SUPERADMIN aktif terakhir dari pencabutan role', async () => {
    const { svc, users } = setup();
    users.seed({ id: 'sa1', userId: 'sa1', status: 'ACTIVE' }, ['SUPERADMIN']);
    await expect(svc.setRoles('sa1', ['USER'], SUPER)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('melindungi SUPERADMIN aktif terakhir dari deaktivasi', async () => {
    const { svc, users } = setup();
    users.seed({ id: 'sa1', userId: 'sa1', status: 'ACTIVE' }, ['SUPERADMIN']);
    await expect(svc.deactivate('sa1', SUPER)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('SUPERADMIN tidak dapat menonaktifkan dirinya sendiri', async () => {
    const { svc, users } = setup();
    users.seed({ id: SUPER.actor.id, userId: 'actor', status: 'ACTIVE' }, ['SUPERADMIN']);
    users.seed({ id: 'sa2', userId: 'sa2', status: 'ACTIVE' }, ['SUPERADMIN']);
    await expect(svc.deactivate(SUPER.actor.id, SUPER)).rejects.toMatchObject({ httpStatus: 403 });
  });

  it('reset password mencabut seluruh session', async () => {
    const { svc, users, sessions, audit } = setup();
    users.seed({ id: 'u1', userId: 'u1', status: 'ACTIVE' }, ['USER']);
    await svc.resetPassword('u1', 'PasswordBaru1', SUPER);
    expect(sessions.revokedFor).toContain('u1');
    expect(audit.actions()).toContain('USER_PASSWORD_RESET');
  });

  it('deactivate user mencabut session', async () => {
    const { svc, users, sessions } = setup();
    users.seed({ id: 'u1', userId: 'u1', status: 'ACTIVE' }, ['USER']);
    const dto = await svc.deactivate('u1', SUPER);
    expect(dto.status).toBe('INACTIVE');
    expect(sessions.revokedFor).toContain('u1');
  });
});

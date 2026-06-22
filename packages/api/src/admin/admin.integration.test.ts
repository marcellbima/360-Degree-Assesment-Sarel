import { describe, expect, it } from 'vitest';
import type { ProgramRow } from '@sarel/core';
import { buildHarness, type Harness } from './harness';

interface Json {
  [k: string]: unknown;
}

async function req(
  h: Harness,
  method: string,
  path: string,
  cookie?: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return await h.app.request(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function progRow(id: string, organizationId: string | null = null, status = 'ACTIVE'): ProgramRow {
  return {
    id,
    code: id,
    name: id,
    description: null,
    year: null,
    startDate: null,
    endDate: null,
    organizationId,
    status,
    createdAt: 'x',
    updatedAt: 'x',
  };
}

async function withRoles(role: string): Promise<{ h: Harness; cookie: string }> {
  const h = await buildHarness();
  await h.seedUser({ id: 'user_super', userId: 'super', roleCodes: ['SUPERADMIN'] });
  await h.seedUser({ id: 'user_admin', userId: 'admin', roleCodes: ['ADMIN'] });
  await h.seedUser({ id: 'user_plain', userId: 'plain', roleCodes: ['USER'] });
  const map: Record<string, string> = { SUPERADMIN: 'super', ADMIN: 'admin', USER: 'plain' };
  const cookie = await h.login(map[role], 'Rahasia123');
  return { h, cookie };
}

describe('Admin integration (Phase 4)', () => {
  it('unauthenticated mendapat 401', async () => {
    const h = await buildHarness();
    const res = await req(h, 'GET', '/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('USER mendapat 403', async () => {
    const { h, cookie } = await withRoles('USER');
    const res = await req(h, 'GET', '/api/admin/users', cookie);
    expect(res.status).toBe(403);
  });

  it('list users mendukung pagination', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    for (let i = 0; i < 5; i += 1) await h.seedUser({ userId: `u${i}`, roleCodes: ['USER'] });
    const res = await req(h, 'GET', '/api/admin/users?page=1&pageSize=2', cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; pageSize: number; total: number };
    expect(body.items.length).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.total).toBeGreaterThanOrEqual(5);
  });

  it('create user mengembalikan 201 tanpa field rahasia', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    const res = await req(h, 'POST', '/api/admin/users', cookie, {
      userId: 'baru',
      fullName: 'Baru',
      password: 'Rahasia123',
      roles: ['USER'],
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Json;
    expect(body.userId).toBe('baru');
    expect('passwordHash' in body).toBe(false);
  });

  it('User ID duplikat menghasilkan 409', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    await h.seedUser({ userId: 'dobel', roleCodes: ['USER'] });
    const res = await req(h, 'POST', '/api/admin/users', cookie, {
      userId: 'dobel',
      fullName: 'X',
      password: 'Rahasia123',
    });
    expect(res.status).toBe(409);
  });

  it('reset password mencabut session user', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    await h.seedUser({ id: 'target', userId: 'target', password: 'Rahasia123', roleCodes: ['USER'] });
    const targetCookie = await h.login('target', 'Rahasia123');
    const reset = await req(h, 'POST', '/api/admin/users/target/reset-password', cookie, {
      password: 'PasswordBaru1',
    });
    expect(reset.status).toBe(200);
    const me = await h.app.request('/api/auth/me', { headers: { cookie: targetCookie } });
    expect(me.status).toBe(401);
  });

  it('deactivate user mencabut session', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    await h.seedUser({ id: 'target', userId: 'target', password: 'Rahasia123', roleCodes: ['USER'] });
    const targetCookie = await h.login('target', 'Rahasia123');
    const res = await req(h, 'POST', '/api/admin/users/target/deactivate', cookie);
    expect(res.status).toBe(200);
    const me = await h.app.request('/api/auth/me', { headers: { cookie: targetCookie } });
    expect(me.status).toBe(401);
  });

  it('SUPERADMIN dapat mengubah role', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    await h.seedUser({ id: 'target', userId: 'target', roleCodes: ['USER'] });
    const res = await req(h, 'PUT', '/api/admin/users/target/roles', cookie, { roles: ['ADMIN'] });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { roles: string[] }).roles).toContain('ADMIN');
  });

  it('ADMIN tidak dapat memberi role (admin.manage) -> 403', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    await h.seedUser({ id: 'target', userId: 'target', roleCodes: ['USER'] });
    const res = await req(h, 'PUT', '/api/admin/users/target/roles', cookie, {
      roles: ['SUPERADMIN'],
    });
    expect(res.status).toBe(403);
  });

  it('organization CRUD minimum', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    const create = await req(h, 'POST', '/api/admin/organizations', cookie, {
      code: 'ORG1',
      name: 'Organisasi',
    });
    expect(create.status).toBe(201);
    const id = ((await create.json()) as { id: string }).id;
    const list = await req(h, 'GET', '/api/admin/organizations', cookie);
    expect(((await list.json()) as { total: number }).total).toBe(1);
    const archived = await req(h, 'POST', `/api/admin/organizations/${id}/archive`, cookie);
    expect(((await archived.json()) as { status: string }).status).toBe('ARCHIVED');
  });

  it('program CRUD minimum', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    const create = await req(h, 'POST', '/api/admin/programs', cookie, { code: 'P1', name: 'P1' });
    expect(create.status).toBe(201);
  });

  it('batch CRUD minimum', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    const program = await req(h, 'POST', '/api/admin/programs', cookie, { code: 'P1', name: 'P1' });
    const programId = ((await program.json()) as { id: string }).id;
    const batch = await req(h, 'POST', '/api/admin/batches', cookie, {
      programId,
      code: 'B1',
      name: 'B1',
    });
    expect(batch.status).toBe(201);
  });

  it('ADMIN hanya melihat program sesuai scope', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    h.programs.rows.set('prog_1', progRow('prog_1'));
    h.programs.rows.set('prog_2', progRow('prog_2'));
    h.scopes.byAdmin.set('user_admin', [
      { id: 's1', adminUserId: 'user_admin', programId: 'prog_1', batchId: null, organizationId: null },
    ]);
    const res = await req(h, 'GET', '/api/admin/programs', cookie);
    const body = (await res.json()) as { items: { id: string }[] };
    expect(body.items.map((p) => p.id)).toEqual(['prog_1']);
  });

  it('ADMIN cross-scope mendapat 403', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    h.programs.rows.set('prog_2', progRow('prog_2'));
    h.scopes.byAdmin.set('user_admin', [
      { id: 's1', adminUserId: 'user_admin', programId: 'prog_1', batchId: null, organizationId: null },
    ]);
    const res = await req(h, 'GET', '/api/admin/programs/prog_2', cookie);
    expect(res.status).toBe(403);
  });

  it('replace admin scopes berhasil (SUPERADMIN)', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    h.organizations.rows.set('org_1', {
      id: 'org_1',
      code: 'O1',
      name: 'O1',
      status: 'ACTIVE',
      createdAt: 'x',
      updatedAt: 'x',
    });
    const res = await req(h, 'PUT', '/api/admin/users/user_admin/scopes', cookie, {
      scopes: [{ organizationId: 'org_1' }],
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as unknown[]).length).toBe(1);
  });

  it('invalid scope (semua null) ditolak 400', async () => {
    const { h, cookie } = await withRoles('SUPERADMIN');
    const res = await req(h, 'PUT', '/api/admin/users/user_admin/scopes', cookie, {
      scopes: [{}],
    });
    expect(res.status).toBe(400);
  });

  it('ADMIN tidak dapat mengubah admin scopes (requireRole SUPERADMIN) -> 403', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    const res = await req(h, 'PUT', '/api/admin/users/user_admin/scopes', cookie, { scopes: [] });
    expect(res.status).toBe(403);
  });

  it('ADMIN dapat membuat Organization dan memperbarui dalam scope; cross-scope 403', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    const create = await req(h, 'POST', '/api/admin/organizations', cookie, { code: 'OADM', name: 'OA' });
    expect(create.status).toBe(201);
    h.organizations.rows.set('org_1', { id: 'org_1', code: 'O1', name: 'O1', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    h.organizations.rows.set('org_2', { id: 'org_2', code: 'O2', name: 'O2', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: null, batchId: null, organizationId: 'org_1' },
    ]);
    const upd = await req(h, 'PATCH', '/api/admin/organizations/org_1', cookie, { name: 'Baru' });
    expect(upd.status).toBe(200);
    const cross = await req(h, 'PATCH', '/api/admin/organizations/org_2', cookie, { name: 'X' });
    expect(cross.status).toBe(403);
  });

  it('ADMIN dapat membuat Program dalam scope; di luar scope 403', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    h.organizations.rows.set('org_1', { id: 'org_1', code: 'O1', name: 'O1', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    h.organizations.rows.set('org_2', { id: 'org_2', code: 'O2', name: 'O2', status: 'ACTIVE', createdAt: 'x', updatedAt: 'x' });
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: null, batchId: null, organizationId: 'org_1' },
    ]);
    const ok = await req(h, 'POST', '/api/admin/programs', cookie, { code: 'PA', name: 'PA', organizationId: 'org_1' });
    expect(ok.status).toBe(201);
    const bad = await req(h, 'POST', '/api/admin/programs', cookie, { code: 'PB', name: 'PB', organizationId: 'org_2' });
    expect(bad.status).toBe(403);
  });

  it('ADMIN dapat membuat Batch dalam scope', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    h.programs.rows.set('prog_1', progRow('prog_1', 'org_1'));
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: null, organizationId: null },
    ]);
    const ok = await req(h, 'POST', '/api/admin/batches', cookie, { programId: 'prog_1', code: 'BA', name: 'BA' });
    expect(ok.status).toBe(201);
  });

  it('ADMIN tidak dapat mengelola user ketika relasi user-scope belum dapat dibuktikan', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    await h.seedUser({ id: 'target', userId: 'target', roleCodes: ['USER'] });
    const create = await req(h, 'POST', '/api/admin/users', cookie, {
      userId: 'baru',
      fullName: 'B',
      password: 'Rahasia123',
    });
    expect(create.status).toBe(403);
    const upd = await req(h, 'PATCH', '/api/admin/users/target', cookie, { fullName: 'Z' });
    expect(upd.status).toBe(403);
  });

  it('ADMIN tidak dapat mengelola ADMIN atau SUPERADMIN', async () => {
    const { h, cookie } = await withRoles('ADMIN');
    expect((await req(h, 'PATCH', '/api/admin/users/user_super', cookie, { fullName: 'X' })).status).toBe(403);
    expect((await req(h, 'PATCH', '/api/admin/users/user_admin', cookie, { fullName: 'X' })).status).toBe(403);
  });
});

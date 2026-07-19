import { describe, expect, it } from 'vitest';
import { buildHarness, type Harness } from './harness';

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

async function base(): Promise<{ h: Harness; superCookie: string }> {
  const h = await buildHarness();
  await h.seedUser({ id: 'user_super', userId: 'super', roleCodes: ['SUPERADMIN'] });
  await h.seedUser({ id: 'user_admin', userId: 'admin', roleCodes: ['ADMIN'] });
  await h.seedUser({ id: 'user_plain', userId: 'plain', roleCodes: ['USER'] });
  for (const u of ['u1', 'u2', 'u3', 'u4']) await h.seedUser({ id: `user_${u}`, userId: u, roleCodes: ['USER'] });
  h.seedProgram('prog_1', 'org_1');
  h.seedProgram('prog_2', 'org_2');
  h.seedBatch('batch_1', 'prog_1');
  h.seedBatch('batch_2', 'prog_1');
  h.seedBatch('batch_x', 'prog_2');
  const superCookie = await h.login('super', 'Rahasia123');
  return { h, superCookie };
}

async function createParticipant(h: Harness, cookie: string, userId: string, batchId: string): Promise<Response> {
  return req(h, 'POST', '/api/admin/programs/prog_1/participants', cookie, { userId, batchId });
}

describe('Phase 5 integration', () => {
  it('unauthenticated 401, USER 403', async () => {
    const { h } = await base();
    expect((await req(h, 'GET', '/api/admin/programs/prog_1/participants')).status).toBe(401);
    const userCookie = await h.login('plain', 'Rahasia123');
    expect((await req(h, 'GET', '/api/admin/programs/prog_1/participants', userCookie)).status).toBe(403);
  });

  it('create participant + list pagination + duplicate 409', async () => {
    const { h, superCookie } = await base();
    expect((await createParticipant(h, superCookie, 'u1', 'batch_1')).status).toBe(201);
    expect((await createParticipant(h, superCookie, 'u2', 'batch_2')).status).toBe(201);
    const dup = await createParticipant(h, superCookie, 'u1', 'batch_1');
    expect(dup.status).toBe(409);
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants?page=1&pageSize=1', superCookie);
    const body = (await list.json()) as { items: unknown[]; total: number; pageSize: number };
    expect(body.items.length).toBe(1);
    expect(body.total).toBe(2);
  });

  it('unknown user 400, batch bukan milik program 400', async () => {
    const { h, superCookie } = await base();
    expect((await createParticipant(h, superCookie, 'tidakada', 'batch_1')).status).toBe(400);
    expect((await createParticipant(h, superCookie, 'u1', 'batch_x')).status).toBe(400);
  });

  it('update targets; SELF selain 1 ditolak', async () => {
    const { h, superCookie } = await base();
    const created = (await (await createParticipant(h, superCookie, 'u1', 'batch_1')).json()) as { id: string };
    const ok = await req(h, 'PUT', `/api/admin/participants/${created.id}/targets`, superCookie, {
      targets: { SUPERIOR: 2, PEER: 3 },
    });
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { targets: Record<string, number> };
    expect(body.targets.SELF).toBe(1);
    expect(body.targets.SUPERIOR).toBe(2);
    const bad = await req(h, 'PUT', `/api/admin/participants/${created.id}/targets`, superCookie, {
      targets: { SELF: 2 },
    });
    expect(bad.status).toBe(400);
  });

  it('create evaluator relation, duplicate 409, SELF ditolak, cross-program ditolak', async () => {
    const { h, superCookie } = await base();
    const subj = (await (await createParticipant(h, superCookie, 'u1', 'batch_1')).json()) as { id: string };
    const evalP = (await (await createParticipant(h, superCookie, 'u2', 'batch_2')).json()) as { id: string };
    const created = await req(h, 'POST', '/api/admin/programs/prog_1/evaluator-relations', superCookie, {
      subjectParticipantId: subj.id,
      evaluatorParticipantId: evalP.id,
      assessmentType: 'PEER',
    });
    expect(created.status).toBe(201);
    const dup = await req(h, 'POST', '/api/admin/programs/prog_1/evaluator-relations', superCookie, {
      subjectParticipantId: subj.id,
      evaluatorParticipantId: evalP.id,
      assessmentType: 'PEER',
    });
    expect(dup.status).toBe(409);
    const self = await req(h, 'POST', '/api/admin/programs/prog_1/evaluator-relations', superCookie, {
      subjectParticipantId: subj.id,
      evaluatorParticipantId: evalP.id,
      assessmentType: 'SELF',
    });
    expect(self.status).toBe(400);
    // cross-program evaluator
    h.seedParticipant({ id: 'pp_cross', userId: 'user_u3', programId: 'prog_2', batchId: 'batch_x' });
    const cross = await req(h, 'POST', '/api/admin/programs/prog_1/evaluator-relations', superCookie, {
      subjectParticipantId: subj.id,
      evaluatorParticipantId: 'pp_cross',
      assessmentType: 'PEER',
    });
    expect(cross.status).toBe(400);
  });

  it('ADMIN hanya melihat participant sesuai scope; butuh scope subject dan evaluator', async () => {
    const { h, superCookie } = await base();
    const subj = (await (await createParticipant(h, superCookie, 'u1', 'batch_1')).json()) as { id: string };
    const evalP = (await (await createParticipant(h, superCookie, 'u2', 'batch_2')).json()) as { id: string };
    // ADMIN scoped hanya ke batch_1
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', adminCookie);
    const body = (await list.json()) as { items: { batchId: string }[] };
    expect(body.items.every((p) => p.batchId === 'batch_1')).toBe(true);
    expect(body.items.length).toBe(1);
    // create relation subject(batch_1) + evaluator(batch_2 di luar scope) -> 403
    const rel = await req(h, 'POST', '/api/admin/programs/prog_1/evaluator-relations', adminCookie, {
      subjectParticipantId: subj.id,
      evaluatorParticipantId: evalP.id,
      assessmentType: 'PEER',
    });
    expect(rel.status).toBe(403);
  });

  it('participant import: preview lalu commit', async () => {
    const { h, superCookie } = await base();
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', superCookie, {
      programId: 'prog_1',
      fileName: 'p.csv',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    expect(preview.status).toBe(200);
    const pjob = (await preview.json()) as { job: { id: string; validRows: number; errorRows: number } };
    expect(pjob.job.validRows).toBe(1);
    expect(pjob.job.errorRows).toBe(0);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, superCookie);
    expect(commit.status).toBe(200);
    expect(((await commit.json()) as { status: string }).status).toBe('COMMITTED');
    // commit kedua -> 409
    const second = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, superCookie);
    expect(second.status).toBe(409);
    // participant benar-benar dibuat
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(1);
  });

  it('participant import Tanpa Batch: preview lalu commit', async () => {
    const {
      h,
      superCookie,
    } = await base();

    const preview = await req(
      h,
      'POST',
      '/api/admin/imports/participants/preview',
      superCookie,
      {
        programId: 'prog_1',
        fileName: 'participant-tanpa-batch.csv',
        rows: [
          {
            rowNumber: 2,
            userId: 'u1',
            batchCode: '',
          },
        ],
      },
    );

    expect(preview.status).toBe(200);

    const previewBody =
      (await preview.json()) as {
        job: {
          id: string;
          validRows: number;
          errorRows: number;
        };
      };

    expect(previewBody.job.validRows).toBe(1);
    expect(previewBody.job.errorRows).toBe(0);

    const commit = await req(
      h,
      'POST',
      `/api/admin/import-jobs/${previewBody.job.id}/commit`,
      superCookie,
    );

    expect(commit.status).toBe(200);

    const list = await req(
      h,
      'GET',
      '/api/admin/programs/prog_1/participants',
      superCookie,
    );

    expect(list.status).toBe(200);

    const listBody =
      (await list.json()) as {
        items: Array<{
          userCode: string;
          batchId: string | null;
        }>;
      };

    const participant =
      listBody.items.find(
        (item) =>
          item.userCode === 'u1',
      );

    expect(participant).toBeDefined();
    expect(participant?.batchId).toBeNull();
  });

  it('preview dengan ERROR tidak dapat di-commit', async () => {
    const { h, superCookie } = await base();
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', superCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'tidakada', batchCode: 'batch_1' }],
    });
    const pjob = (await preview.json()) as { job: { id: string; errorRows: number } };
    expect(pjob.job.errorRows).toBe(1);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, superCookie);
    expect(commit.status).toBe(409);
  });

  it('evaluator import: preview lalu commit', async () => {
    const { h, superCookie } = await base();
    await createParticipant(h, superCookie, 'u1', 'batch_1');
    await createParticipant(h, superCookie, 'u2', 'batch_2');
    const preview = await req(h, 'POST', '/api/admin/imports/evaluators/preview', superCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, subjectUserId: 'u1', evaluatorUserId: 'u2', assessmentType: 'PEER' }],
    });
    expect(preview.status).toBe(200);
    const pjob = (await preview.json()) as { job: { id: string; validRows: number } };
    expect(pjob.job.validRows).toBe(1);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, superCookie);
    expect(commit.status).toBe(200);
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/evaluator-relations', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(1);
  });

  // ---- Atomic commit ----
  it('atomic rollback participant: batch gagal -> tidak ada participant & job FAILED', async () => {
    const { h, superCookie } = await base();
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', superCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    const jobId = ((await preview.json()) as { job: { id: string } }).job.id;
    h.importCommit.failNext = true;
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${jobId}/commit`, superCookie);
    expect(commit.status).toBe(500);
    // job tidak COMMITTED
    const job = await req(h, 'GET', `/api/admin/import-jobs/${jobId}`, superCookie);
    expect(((await job.json()) as { job: { status: string } }).job.status).toBe('FAILED');
    // tidak ada participant tersimpan
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(0);
  });

  it('atomic rollback evaluator: batch gagal -> tidak ada relation & job FAILED', async () => {
    const { h, superCookie } = await base();
    await createParticipant(h, superCookie, 'u1', 'batch_1');
    await createParticipant(h, superCookie, 'u2', 'batch_2');
    const preview = await req(h, 'POST', '/api/admin/imports/evaluators/preview', superCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, subjectUserId: 'u1', evaluatorUserId: 'u2', assessmentType: 'PEER' }],
    });
    const jobId = ((await preview.json()) as { job: { id: string } }).job.id;
    h.importCommit.failNext = true;
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${jobId}/commit`, superCookie);
    expect(commit.status).toBe(500);
    const job = await req(h, 'GET', `/api/admin/import-jobs/${jobId}`, superCookie);
    expect(((await job.json()) as { job: { status: string } }).job.status).toBe('FAILED');
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/evaluator-relations', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(0);
  });

  // ---- Scope tingkat batch ----
  it('batch-only ADMIN: preview & commit participant sukses pada batch dalam scope', async () => {
    const { h, superCookie } = await base();
    void superCookie;
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    expect(preview.status).toBe(200);
    const pjob = (await preview.json()) as { job: { id: string; validRows: number; errorRows: number } };
    expect(pjob.job.validRows).toBe(1);
    expect(pjob.job.errorRows).toBe(0);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, adminCookie);
    expect(commit.status).toBe(200);
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', adminCookie);
    expect(((await list.json()) as { total: number }).total).toBe(1);
  });

  it('batch-only ADMIN: row batch lain menjadi ERROR di preview', async () => {
    const { h } = await base();
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', adminCookie, {
      programId: 'prog_1',
      rows: [
        { rowNumber: 2, userId: 'u1', batchCode: 'batch_1' },
        { rowNumber: 3, userId: 'u2', batchCode: 'batch_2' },
      ],
    });
    const pjob = (await preview.json()) as { job: { validRows: number; errorRows: number } };
    expect(pjob.job.validRows).toBe(1);
    expect(pjob.job.errorRows).toBe(1);
  });

  it('evaluator import: hanya subject dalam scope -> ERROR', async () => {
    const { h, superCookie } = await base();
    await createParticipant(h, superCookie, 'u1', 'batch_1');
    await createParticipant(h, superCookie, 'u2', 'batch_2');
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/evaluators/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, subjectUserId: 'u1', evaluatorUserId: 'u2', assessmentType: 'PEER' }],
    });
    const pjob = (await preview.json()) as { job: { validRows: number; errorRows: number } };
    expect(pjob.job.errorRows).toBe(1);
    expect(pjob.job.validRows).toBe(0);
  });

  it('evaluator import: hanya evaluator dalam scope -> ERROR', async () => {
    const { h, superCookie } = await base();
    await createParticipant(h, superCookie, 'u1', 'batch_1');
    await createParticipant(h, superCookie, 'u2', 'batch_2');
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_2', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/evaluators/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, subjectUserId: 'u1', evaluatorUserId: 'u2', assessmentType: 'PEER' }],
    });
    const pjob = (await preview.json()) as { job: { validRows: number; errorRows: number } };
    expect(pjob.job.errorRows).toBe(1);
    expect(pjob.job.validRows).toBe(0);
  });

  it('evaluator import: dua batch scope terpisah mencakup subject & evaluator (OR) -> VALID & commit sukses', async () => {
    const { h, superCookie } = await base();
    await createParticipant(h, superCookie, 'u1', 'batch_1');
    await createParticipant(h, superCookie, 'u2', 'batch_2');
    h.scopes.byAdmin.set('user_admin', [
      { id: 's1', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
      { id: 's2', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_2', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/evaluators/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, subjectUserId: 'u1', evaluatorUserId: 'u2', assessmentType: 'PEER' }],
    });
    const pjob = (await preview.json()) as { job: { id: string; validRows: number } };
    expect(pjob.job.validRows).toBe(1);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, adminCookie);
    expect(commit.status).toBe(200);
    expect(((await commit.json()) as { status: string }).status).toBe('COMMITTED');
  });

  it('scope berubah setelah preview -> commit ditolak 403 tanpa partial insert', async () => {
    const { h } = await base();
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_1', organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    const jobId = ((await preview.json()) as { job: { id: string; validRows: number } }).job.id;
    // scope berubah: batch_1 tidak lagi tercakup
    h.scopes.byAdmin.set('user_admin', [
      { id: 's2', adminUserId: 'user_admin', programId: 'prog_1', batchId: 'batch_2', organizationId: null },
    ]);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${jobId}/commit`, adminCookie);
    expect(commit.status).toBe(403);
    // tidak ada participant tersimpan (verifikasi sebagai SUPERADMIN agar tak terfilter scope)
    const superCookie = await h.login('super', 'Rahasia123');
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(0);
  });

  it('SUPERADMIN unrestricted: import lintas batch tanpa scope', async () => {
    const { h, superCookie } = await base();
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', superCookie, {
      programId: 'prog_1',
      rows: [
        { rowNumber: 2, userId: 'u1', batchCode: 'batch_1' },
        { rowNumber: 3, userId: 'u2', batchCode: 'batch_2' },
      ],
    });
    const pjob = (await preview.json()) as { job: { id: string; validRows: number; errorRows: number } };
    expect(pjob.job.validRows).toBe(2);
    expect(pjob.job.errorRows).toBe(0);
    const commit = await req(h, 'POST', `/api/admin/import-jobs/${pjob.job.id}/commit`, superCookie);
    expect(commit.status).toBe(200);
    const list = await req(h, 'GET', '/api/admin/programs/prog_1/participants', superCookie);
    expect(((await list.json()) as { total: number }).total).toBe(2);
  });

  it('USER tetap 403 pada import preview', async () => {
    const { h } = await base();
    const userCookie = await h.login('plain', 'Rahasia123');
    const res = await req(h, 'POST', '/api/admin/imports/participants/preview', userCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    expect(res.status).toBe(403);
  });

  it('import job milik actor lain ditolak; SUPERADMIN dapat membaca semua', async () => {
    const { h, superCookie } = await base();
    // ADMIN scoped ke prog_1 membuat preview
    h.scopes.byAdmin.set('user_admin', [
      { id: 's', adminUserId: 'user_admin', programId: 'prog_1', batchId: null, organizationId: null },
    ]);
    const adminCookie = await h.login('admin', 'Rahasia123');
    const preview = await req(h, 'POST', '/api/admin/imports/participants/preview', adminCookie, {
      programId: 'prog_1',
      rows: [{ rowNumber: 2, userId: 'u1', batchCode: 'batch_1' }],
    });
    const jobId = ((await preview.json()) as { job: { id: string } }).job.id;
    // user lain (admin kedua) tidak boleh membaca
    await h.seedUser({ id: 'user_admin2', userId: 'admin2', roleCodes: ['ADMIN'] });
    const admin2Cookie = await h.login('admin2', 'Rahasia123');
    expect((await req(h, 'GET', `/api/admin/import-jobs/${jobId}`, admin2Cookie)).status).toBe(403);
    // SUPERADMIN boleh membaca
    expect((await req(h, 'GET', `/api/admin/import-jobs/${jobId}`, superCookie)).status).toBe(200);
  });
});

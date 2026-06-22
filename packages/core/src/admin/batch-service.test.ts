import { describe, expect, it } from 'vitest';
import { BatchService } from './batch-service';
import {
  FakeAdminScopeRepository,
  FakeBatchRepository,
  FakeProgramRepository,
  MutableClock,
  makeAuditWriter,
} from './fakes';
import type { ProgramRow } from '../ports/program-repository';
import type { AdminContext } from './types';

const SUPER: AdminContext = {
  actor: { id: 'sa', userId: 'sa', roles: ['SUPERADMIN'] },
  ip: '127.0.0.1',
  userAgent: null,
  requestId: 'req',
};

function programRow(id: string, status = 'ACTIVE'): ProgramRow {
  return {
    id,
    code: id,
    name: id,
    description: null,
    year: null,
    startDate: null,
    endDate: null,
    organizationId: 'org_1',
    status,
    createdAt: 'x',
    updatedAt: 'x',
  };
}

function setup() {
  const clock = new MutableClock();
  const batches = new FakeBatchRepository();
  const programs = new FakeProgramRepository();
  const scopes = new FakeAdminScopeRepository();
  const { writer } = makeAuditWriter(clock);
  return { svc: new BatchService(batches, programs, scopes, clock, writer), batches, programs };
}

describe('BatchService', () => {
  it('batch harus berasal dari program yang ada (404 bila tidak ada)', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ programId: 'prog_x', code: 'B1', name: 'B' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 404 });
  });

  it('program diarsipkan tidak menerima batch baru (409)', async () => {
    const { svc, programs } = setup();
    programs.seed(programRow('prog_1', 'ARCHIVED'));
    await expect(
      svc.create({ programId: 'prog_1', code: 'B1', name: 'B' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('create sukses pada program aktif', async () => {
    const { svc, programs } = setup();
    programs.seed(programRow('prog_1'));
    const dto = await svc.create({ programId: 'prog_1', code: 'B1', name: 'Batch 1' }, SUPER);
    expect(dto.programId).toBe('prog_1');
    expect(dto.status).toBe('ACTIVE');
  });

  it('kode batch duplikat dalam program 409', async () => {
    const { svc, programs } = setup();
    programs.seed(programRow('prog_1'));
    await svc.create({ programId: 'prog_1', code: 'B1', name: 'A' }, SUPER);
    await expect(
      svc.create({ programId: 'prog_1', code: 'B1', name: 'B' }, SUPER),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('tanggal mulai setelah selesai ditolak 400', async () => {
    const { svc, programs } = setup();
    programs.seed(programRow('prog_1'));
    await expect(
      svc.create(
        { programId: 'prog_1', code: 'B1', name: 'B', startDate: '2026-03-01', endDate: '2026-01-01' },
        SUPER,
      ),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
});

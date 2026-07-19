import { describe, expect, it } from 'vitest';
import { ImportService } from './import-service';
import type {
  ImportJobRecord,
  ImportJobRepositoryPort,
  ImportJobRowRecord,
  NewImportJob,
  NewImportJobRow,
} from '../ports/import-job-repository';
import type { NewParticipant, ParticipantRepositoryPort } from '../ports/participant-repository';
import type { NewRelation, RelationRepositoryPort } from '../ports/evaluator-relation-repository';
import type { ImportCommitRepositoryPort } from '../ports/import-commit-repository';
import type { ImportLookupRepositoryPort } from '../ports/import-lookup-repository';
import type { AssessmentTypeRepositoryPort } from '../ports/assessment-type-repository';
import { FakeAdminScopeRepository, FakeProgramRepository, MutableClock, makeAuditWriter } from './fakes';
import type { AdminContext } from './types';

class FakeImportJobs implements ImportJobRepositoryPort {
  job: ImportJobRecord | null = null;
  rows: ImportJobRowRecord[] = [];
  seed(job: Partial<ImportJobRecord> & { id: string }): void {
    this.job = {
      id: job.id,
      type: job.type ?? 'PARTICIPANT',
      status: job.status ?? 'PREVIEWED',
      createdBy: job.createdBy ?? 'sa',
      programId: job.programId ?? 'prog_1',
      fileName: null,
      checksum: 'c',
      totalRows: job.totalRows ?? 1,
      validRows: job.validRows ?? 1,
      skippedRows: 0,
      errorRows: job.errorRows ?? 0,
      errorSummary: null,
      committedAt: null,
      expiresAt: job.expiresAt ?? '2999-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
  }
  async create(_job: NewImportJob, _rows: NewImportJobRow[]): Promise<void> {
    void _job;
    void _rows;
  }
  async findById(id: string): Promise<ImportJobRecord | null> {
    return this.job && this.job.id === id ? this.job : null;
  }
  async listRows(): Promise<ImportJobRowRecord[]> {
    return this.rows;
  }
  async setStatus(
    _id: string,
    status: string,
    fields: { committedAt?: string | null; errorSummary?: string | null },
  ): Promise<void> {
    if (this.job) {
      this.job.status = status;
      if (fields.committedAt !== undefined) this.job.committedAt = fields.committedAt;
    }
  }
}

const participants = {
  async findActiveByUserAndProgram() {
    return null;
  },
  async insert() {},
} as unknown as ParticipantRepositoryPort;
const relations = {} as unknown as RelationRepositoryPort;
const lookups = {} as unknown as ImportLookupRepositoryPort;
const assessmentTypes = { async list() { return []; } } as unknown as AssessmentTypeRepositoryPort;

// Fake commit repo atomik: failNext -> melempar sebelum menerapkan mutation,
// sehingga tidak ada participant/relation tersimpan dan job tidak COMMITTED.
class FakeImportCommit implements ImportCommitRepositoryPort {
  failNext = false;
  committedParticipants: NewParticipant[] = [];
  committedRelations: NewRelation[] = [];
  reactivated: string[] = [];
  constructor(private readonly importJobs: FakeImportJobs) {}
  async commitParticipants(jobId: string, committedAt: string, list: NewParticipant[]): Promise<void> {
    if (this.failNext) throw new Error('simulated batch failure');
    this.committedParticipants.push(...list);
    await this.importJobs.setStatus(jobId, 'COMMITTED', { committedAt });
  }
  async commitEvaluators(
    jobId: string,
    committedAt: string,
    inserts: NewRelation[],
    reactivateIds: string[],
  ): Promise<void> {
    if (this.failNext) throw new Error('simulated batch failure');
    this.committedRelations.push(...inserts);
    this.reactivated.push(...reactivateIds);
    await this.importJobs.setStatus(jobId, 'COMMITTED', { committedAt });
  }
}

function ctx(roles: string[], id = 'sa'): AdminContext {
  return {
    actor: { id, userId: 'u', roles, permissions: ['participant.import'] },
    ip: '127.0.0.1',
    userAgent: null,
    requestId: 'r',
  };
}
const SUPER = ctx(['SUPERADMIN']);

function setup(jobOverrides: Partial<ImportJobRecord> & { id: string }) {
  const clock = new MutableClock();
  const importJobs = new FakeImportJobs();
  importJobs.seed(jobOverrides);
  const programs = new FakeProgramRepository();
  programs.seed({
    id: 'prog_1',
    code: 'P1',
    name: 'P1',
    description: null,
    year: null,
    startDate: null,
    endDate: null,
    organizationId: 'org_1',
    status: 'ACTIVE',
    createdAt: 'x',
    updatedAt: 'x',
  });
  const { writer } = makeAuditWriter(clock);
  const commit = new FakeImportCommit(importJobs);
  const svc = new ImportService({
    importJobs,
    commit,
    lookups,
    programs,
    assessmentTypes,
    participants,
    relations,
    scopes: new FakeAdminScopeRepository(),
    clock,
    audit: writer,
  });
  return { svc, importJobs, commit };
}

function validRow(
  id: string,
  normalized: Record<string, string | null>,
): ImportJobRowRecord {
  return { id, importJobId: 'j1', rowNumber: 2, status: 'VALID', message: null, normalized: JSON.stringify(normalized) };
}

describe('ImportService commit state transitions', () => {
  it('commit job dengan error ditolak 409', async () => {
    const { svc } = setup({ id: 'j1', errorRows: 1 });
    await expect(svc.commit('j1', SUPER)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('commit job COMMITTED ditolak 409 (commit kedua)', async () => {
    const { svc } = setup({ id: 'j1', status: 'COMMITTED' });
    await expect(svc.commit('j1', SUPER)).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('commit job kedaluwarsa ditolak 409', async () => {
    const { svc, importJobs } = setup({ id: 'j1', expiresAt: '2000-01-01T00:00:00Z' });
    await expect(svc.commit('j1', SUPER)).rejects.toMatchObject({ httpStatus: 409 });
    expect(importJobs.job?.status).toBe('EXPIRED');
  });

  it('job milik actor lain ditolak untuk ADMIN non-owner 403', async () => {
    const { svc } = setup({ id: 'j1', createdBy: 'someone_else' });
    await expect(svc.commit('j1', ctx(['ADMIN'], 'admin_x'))).rejects.toMatchObject({ httpStatus: 403 });
  });

  it('commit sukses untuk job PREVIEWED tanpa error', async () => {
    const { svc, importJobs } = setup({ id: 'j1' });
    const result = await svc.commit('j1', SUPER);
    expect(result.status).toBe('COMMITTED');
    expect(importJobs.job?.status).toBe('COMMITTED');
  });

  it('atomic: commit participant sukses menulis seluruh row VALID + COMMITTED', async () => {
    const { svc, importJobs, commit } = setup({ id: 'j1', validRows: 2, totalRows: 2 });
    importJobs.rows = [
      validRow('r1', { userDbId: 'user_1', batchId: 'batch_1' }),
      validRow('r2', { userDbId: 'user_2', batchId: 'batch_1' }),
    ];
    const result = await svc.commit('j1', SUPER);
    expect(result.status).toBe('COMMITTED');
    expect(importJobs.job?.status).toBe('COMMITTED');
    expect(commit.committedParticipants).toHaveLength(2);
  });

  it('commit participant Tanpa Batch menyimpan batchId null', async () => {
    const { svc, importJobs, commit } = setup({
      id: 'j1',
      validRows: 1,
      totalRows: 1,
    });

    importJobs.rows = [
      validRow('r1', {
        userDbId: 'user_1',
        batchId: null,
      }),
    ];

    const result = await svc.commit(
      'j1',
      SUPER,
    );

    expect(result.status).toBe('COMMITTED');
    expect(commit.committedParticipants).toHaveLength(1);
    expect(commit.committedParticipants[0].batchId).toBeNull();
  });

  it('atomic rollback participant: batch gagal -> tidak ada data tersimpan & job tidak COMMITTED', async () => {
    const { svc, importJobs, commit } = setup({ id: 'j1', validRows: 1, totalRows: 1 });
    importJobs.rows = [validRow('r1', { userDbId: 'user_1', batchId: 'batch_1' })];
    commit.failNext = true;
    await expect(svc.commit('j1', SUPER)).rejects.toMatchObject({ httpStatus: 500 });
    expect(commit.committedParticipants).toHaveLength(0);
    expect(importJobs.job?.status).toBe('FAILED');
    expect(importJobs.job?.status).not.toBe('COMMITTED');
  });

  it('row SKIPPED tidak menghasilkan participant', async () => {
    const { svc, importJobs, commit } = setup({ id: 'j1', validRows: 1, totalRows: 2 });
    importJobs.rows = [
      validRow('r1', { userDbId: 'user_1', batchId: 'batch_1' }),
      { id: 'r2', importJobId: 'j1', rowNumber: 3, status: 'SKIPPED', message: 'dup', normalized: null },
    ];
    await svc.commit('j1', SUPER);
    expect(commit.committedParticipants).toHaveLength(1);
    expect(commit.committedParticipants[0].userId).toBe('user_1');
  });
});

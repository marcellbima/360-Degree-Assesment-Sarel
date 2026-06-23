import { eq } from 'drizzle-orm';
import type {
  ImportJobRecord,
  ImportJobRepositoryPort,
  ImportJobRowRecord,
  NewImportJob,
  NewImportJobRow,
} from '@sarel/core';
import type { Db } from '../client';
import { importJobRows, importJobs } from '../schema/schema';

export class D1ImportJobRepository implements ImportJobRepositoryPort {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  async create(job: NewImportJob, rows: NewImportJobRow[]): Promise<void> {
    const insertJob = this.db.insert(importJobs).values({
      id: job.id,
      type: job.type,
      status: job.status,
      createdBy: job.createdBy,
      programId: job.programId,
      fileName: job.fileName,
      checksum: job.checksum,
      totalRows: job.totalRows,
      validRows: job.validRows,
      skippedRows: job.skippedRows,
      errorRows: job.errorRows,
      errorSummary: job.errorSummary,
      expiresAt: job.expiresAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
    if (rows.length === 0) {
      await insertJob.run();
      return;
    }
    const insertRows = this.db.insert(importJobRows).values(
      rows.map((r) => ({
        id: r.id,
        importJobId: job.id,
        rowNumber: r.rowNumber,
        status: r.status,
        message: r.message,
        normalized: r.normalized,
        createdAt: r.createdAt,
      })),
    );
    await this.db.batch([insertJob, insertRows]);
  }

  async findById(id: string): Promise<ImportJobRecord | null> {
    const r = await this.db.select().from(importJobs).where(eq(importJobs.id, id)).get();
    if (!r) return null;
    return {
      id: r.id,
      type: r.type,
      status: r.status,
      createdBy: r.createdBy ?? null,
      programId: r.programId ?? null,
      fileName: r.fileName ?? null,
      checksum: r.checksum ?? null,
      totalRows: r.totalRows,
      validRows: r.validRows,
      skippedRows: r.skippedRows,
      errorRows: r.errorRows,
      errorSummary: r.errorSummary ?? null,
      committedAt: r.committedAt ?? null,
      expiresAt: r.expiresAt ?? null,
      createdAt: r.createdAt,
    };
  }

  async listRows(jobId: string): Promise<ImportJobRowRecord[]> {
    const rows = await this.db
      .select()
      .from(importJobRows)
      .where(eq(importJobRows.importJobId, jobId))
      .all();
    return rows.map((r) => ({
      id: r.id,
      importJobId: r.importJobId,
      rowNumber: r.rowNumber,
      status: r.status,
      message: r.message ?? null,
      normalized: r.normalized ?? null,
    }));
  }

  async setStatus(
    id: string,
    status: string,
    fields: { committedAt?: string | null; errorSummary?: string | null; updatedAt: string },
  ): Promise<void> {
    const set: Record<string, string | null> = { status, updatedAt: fields.updatedAt };
    if (fields.committedAt !== undefined) set.committedAt = fields.committedAt;
    if (fields.errorSummary !== undefined) set.errorSummary = fields.errorSummary;
    await this.db.update(importJobs).set(set).where(eq(importJobs.id, id)).run();
  }
}

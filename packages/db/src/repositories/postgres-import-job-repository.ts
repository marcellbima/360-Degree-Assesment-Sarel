import {
  eq,
} from 'drizzle-orm';
import type {
  ImportJobRecord,
  ImportJobRepositoryPort,
  ImportJobRowRecord,
  NewImportJob,
  NewImportJobRow,
} from '@sarel/core';

import type {
  PostgresDatabase,
} from '../postgres-client';
import {
  importJobRows,
  importJobs,
} from '../schema/postgres-schema';

export class PostgresImportJobRepository
  implements ImportJobRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  async create(
    job: NewImportJob,
    rows: NewImportJobRow[],
  ): Promise<void> {
    await this.db.transaction(
      async (transaction) => {
        await transaction
          .insert(importJobs)
          .values({
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
            errorSummary:
              job.errorSummary,
            expiresAt: job.expiresAt,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          });

        if (rows.length === 0) {
          return;
        }

        await transaction
          .insert(importJobRows)
          .values(
            rows.map((row) => ({
              id: row.id,
              importJobId: job.id,
              rowNumber:
                row.rowNumber,
              status: row.status,
              message: row.message,
              normalized:
                row.normalized,
              createdAt:
                row.createdAt,
            })),
          );
      },
    );
  }

  async findById(
    id: string,
  ): Promise<ImportJobRecord | null> {
    const [row] =
      await this.db
        .select()
        .from(importJobs)
        .where(
          eq(importJobs.id, id),
        )
        .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      createdBy:
        row.createdBy ?? null,
      programId:
        row.programId ?? null,
      fileName:
        row.fileName ?? null,
      checksum:
        row.checksum ?? null,
      totalRows:
        row.totalRows,
      validRows:
        row.validRows,
      skippedRows:
        row.skippedRows,
      errorRows:
        row.errorRows,
      errorSummary:
        row.errorSummary ?? null,
      committedAt:
        row.committedAt ?? null,
      expiresAt:
        row.expiresAt ?? null,
      createdAt:
        row.createdAt,
    };
  }

  async listRows(
    jobId: string,
  ): Promise<ImportJobRowRecord[]> {
    const rows =
      await this.db
        .select()
        .from(importJobRows)
        .where(
          eq(
            importJobRows.importJobId,
            jobId,
          ),
        );

    return rows.map((row) => ({
      id: row.id,
      importJobId:
        row.importJobId,
      rowNumber:
        row.rowNumber,
      status: row.status,
      message:
        row.message ?? null,
      normalized:
        row.normalized ?? null,
    }));
  }

  async setStatus(
    id: string,
    status: string,
    fields: {
      committedAt?: string | null;
      errorSummary?: string | null;
      updatedAt: string;
    },
  ): Promise<void> {
    const values: {
      status: string;
      updatedAt: string;
      committedAt?: string | null;
      errorSummary?: string | null;
    } = {
      status,
      updatedAt:
        fields.updatedAt,
    };

    if (
      fields.committedAt !==
      undefined
    ) {
      values.committedAt =
        fields.committedAt;
    }

    if (
      fields.errorSummary !==
      undefined
    ) {
      values.errorSummary =
        fields.errorSummary;
    }

    await this.db
      .update(importJobs)
      .set(values)
      .where(
        eq(importJobs.id, id),
      );
  }
}

import {
  and,
  count,
  eq,
  ilike,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  CompletePublicFormSheetSyncAttemptInput,
  ConnectPublicFormGoogleSheetInput,
  NewPublicForm,
  NewPublicFormSubmission,
  PublicFormDefinition,
  PublicFormDraftPatch,
  PublicFormListFilter,
  PublicFormRepositoryPort,
  PublicFormRow,
  PublicFormVersionRow,
  PublishPublicFormInput,
} from '@sarel/core';

import type { PostgresDatabase } from '../postgres-client';
import {
  publicForms,
  publicFormSubmissions,
  publicFormVersions,
} from '../schema/postgres-schema';

type PublicFormDatabaseRow =
  typeof publicForms.$inferSelect;

export class PostgresPublicFormRepository
  implements PublicFormRepositoryPort
{
  constructor(
    private readonly db: PostgresDatabase,
  ) {}

  private toRow(
    row: PublicFormDatabaseRow,
  ): PublicFormRow {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      status: row.status,
      draftDefinition:
        row.draftDefinition as PublicFormDefinition,
      publishedDefinition:
        row.publishedDefinition
          ? (row.publishedDefinition as PublicFormDefinition)
          : null,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      publishedAt: row.publishedAt,
      googleSheetsEnabled:
        row.googleSheetsEnabled,
      googleSheetsWebhookUrl:
        row.googleSheetsWebhookUrl,
      googleSheetId:
        row.googleSheetId,
      googleSheetUrl:
        row.googleSheetUrl,
      googleSheetStatus:
        row.googleSheetStatus as
          PublicFormRow['googleSheetStatus'],
      googleSheetConnectedAt:
        row.googleSheetConnectedAt,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(
    filter: PublicFormListFilter,
  ): Promise<{
    items: PublicFormRow[];
    total: number;
  }> {
    const conditions: SQL[] = [];

    if (filter.search) {
      conditions.push(
        ilike(
          publicForms.title,
          `%${filter.search}%`,
        ),
      );
    }

    if (filter.status) {
      conditions.push(
        eq(
          publicForms.status,
          filter.status,
        ),
      );
    }

    const where =
      conditions.length > 0
        ? and(...conditions)
        : undefined;

    const [totalRow] = await this.db
      .select({
        value: count(),
      })
      .from(publicForms)
      .where(where);

    const rows = await this.db
      .select()
      .from(publicForms)
      .where(where)
      .orderBy(publicForms.updatedAt)
      .limit(filter.limit)
      .offset(filter.offset);

    return {
      items: rows.map((row) =>
        this.toRow(row),
      ),
      total: totalRow?.value ?? 0,
    };
  }

  async findById(
    id: string,
  ): Promise<PublicFormRow | null> {
    const [row] = await this.db
      .select()
      .from(publicForms)
      .where(eq(publicForms.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async findBySlug(
    slug: string,
  ): Promise<PublicFormRow | null> {
    const [row] = await this.db
      .select()
      .from(publicForms)
      .where(eq(publicForms.slug, slug))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async insert(
    row: NewPublicForm,
  ): Promise<void> {
    await this.db
      .insert(publicForms)
      .values(row);
  }

  async updateDraft(
    id: string,
    patch: PublicFormDraftPatch,
  ): Promise<void> {
    const values: {
      updatedAt: string;
      slug?: string;
      title?: string;
      description?: string | null;
      draftDefinition?: PublicFormDefinition;
      opensAt?: string | null;
      closesAt?: string | null;
      googleSheetsEnabled?: boolean;
      googleSheetsWebhookUrl?: string | null;
    } = {
      updatedAt: patch.updatedAt,
    };

    if (patch.slug !== undefined) {
      values.slug = patch.slug;
    }

    if (patch.title !== undefined) {
      values.title = patch.title;
    }

    if (patch.description !== undefined) {
      values.description =
        patch.description;
    }

    if (
      patch.draftDefinition !==
      undefined
    ) {
      values.draftDefinition =
        patch.draftDefinition;
    }

    if (patch.opensAt !== undefined) {
      values.opensAt = patch.opensAt;
    }

    if (patch.closesAt !== undefined) {
      values.closesAt =
        patch.closesAt;
    }

    if (
      patch.googleSheetsEnabled !==
      undefined
    ) {
      values.googleSheetsEnabled =
        patch.googleSheetsEnabled;
    }

    if (
      patch.googleSheetsWebhookUrl !==
      undefined
    ) {
      values.googleSheetsWebhookUrl =
        patch.googleSheetsWebhookUrl;
    }

    await this.db
      .update(publicForms)
      .set(values)
      .where(eq(publicForms.id, id));
  }

  async publish(
    id: string,
    input: PublishPublicFormInput,
  ): Promise<PublicFormVersionRow> {
    return await this.db.transaction(
      async (tx) => {
        /*
         * Lock parent form memastikan dua
         * permintaan Publish tidak memperoleh
         * nomor versi yang sama.
         */
        await tx.execute(sql`
          SELECT
            ${publicForms.id}
          FROM
            ${publicForms}
          WHERE
            ${publicForms.id} = ${id}
          FOR UPDATE
        `);

        const [latest] = await tx
          .select({
            value:
              sql<number>`COALESCE(MAX(${publicFormVersions.versionNumber}), 0)`,
          })
          .from(publicFormVersions)
          .where(
            eq(
              publicFormVersions.publicFormId,
              id,
            ),
          );

        const versionNumber =
          Number(latest?.value ?? 0) + 1;

        const version:
          PublicFormVersionRow = {
            id: input.versionId,
            publicFormId: id,
            versionNumber,
            definition:
              input.publishedDefinition,
            publishedAt:
              input.publishedAt,
            createdBy:
              input.createdBy,
            createdAt:
              input.publishedAt,
          };

        await tx
          .insert(publicFormVersions)
          .values(version);

        await tx
          .update(publicForms)
          .set({
            status: 'PUBLISHED',
            publishedDefinition:
              input.publishedDefinition,
            opensAt: input.opensAt,
            closesAt: input.closesAt,
            publishedAt:
              input.publishedAt,
            updatedAt: input.updatedAt,
          })
          .where(
            eq(publicForms.id, id),
          );

        return version;
      },
    );
  }

  async unpublish(
    id: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(publicForms)
      .set({
        status: 'DRAFT',
        updatedAt,
      })
      .where(eq(publicForms.id, id));
  }

  async connectGoogleSheet(
    id: string,
    input: ConnectPublicFormGoogleSheetInput,
  ): Promise<void> {
    await this.db
      .update(publicForms)
      .set({
        googleSheetId:
          input.sheetId,
        googleSheetUrl:
          input.sheetUrl,
        googleSheetStatus:
          'CONNECTED',
        googleSheetConnectedAt:
          input.connectedAt,
        updatedAt:
          input.connectedAt,
      })
      .where(
        eq(
          publicForms.id,
          id,
        ),
      );
  }

  async disconnectGoogleSheet(
    id: string,
    updatedAt: string,
  ): Promise<void> {
    await this.db
      .update(publicForms)
      .set({
        googleSheetId: null,
        googleSheetUrl: null,
        googleSheetStatus:
          'NOT_CONNECTED',
        googleSheetConnectedAt: null,
        updatedAt,
      })
      .where(
        eq(publicForms.id, id),
      );
  }

  async deleteById(
    id: string,
  ): Promise<boolean> {
    return await this.db.transaction(
      async (tx) => {
        /*
         * Publish dan Delete menggunakan lock
         * yang sama untuk mencegah race
         * condition.
         */
        await tx.execute(sql`
          SELECT
            ${publicForms.id}
          FROM
            ${publicForms}
          WHERE
            ${publicForms.id} = ${id}
          FOR UPDATE
        `);

        const [versionTotal] =
          await tx
            .select({
              value: count(),
            })
            .from(publicFormVersions)
            .where(
              eq(
                publicFormVersions.publicFormId,
                id,
              ),
            );

        if (
          (versionTotal?.value ?? 0) > 0
        ) {
          return false;
        }

        await tx
          .delete(publicFormSubmissions)
          .where(
            eq(
              publicFormSubmissions.formId,
              id,
            ),
          );

        const deleted = await tx
          .delete(publicForms)
          .where(
            eq(publicForms.id, id),
          )
          .returning({
            id: publicForms.id,
          });

        return deleted.length > 0;
      },
    );
  }

  async insertSubmission(
    row: NewPublicFormSubmission,
  ): Promise<void> {
    await this.db
      .insert(publicFormSubmissions)
      .values(row);
  }

  async completeSubmissionSheetSyncAttempt(
    id: string,
    input: CompletePublicFormSheetSyncAttemptInput,
  ): Promise<void> {
    await this.db
      .update(publicFormSubmissions)
      .set({
        sheetSyncStatus: input.status,
        sheetSyncAttempts: sql`
          ${publicFormSubmissions.sheetSyncAttempts} + 1
        `,
        sheetSyncedAt: input.syncedAt,
        sheetSyncError: input.error,
      })
      .where(
        eq(
          publicFormSubmissions.id,
          id,
        ),
      );
  }
}

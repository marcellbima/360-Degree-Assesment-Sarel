import {
  AppError,
  type Paginated,
} from '@sarel/shared';

import type { ClockPort } from '../ports/clock';
import type {
  PublicFormSheetSyncPort,
} from '../ports/public-form-sheet-sync';
import type {
  PublicFormDefinition,
  PublicFormRepositoryPort,
  PublicFormRow,
} from '../ports/public-form-repository';
import { generateId } from './id';
import {
  buildPage,
  offsetOf,
  type AdminContext,
} from './types';

export interface PublicFormListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface CreatePublicFormInput {
  slug: string;
  definition: PublicFormDefinition;
  googleSheetsEnabled?: boolean;
  googleSheetsWebhookUrl?: string | null;
}


export interface UpdatePublicFormDraftInput {
  slug?: string;
  definition?: PublicFormDefinition;
  opensAt?: string | null;
  closesAt?: string | null;
  googleSheetsEnabled?: boolean;
  googleSheetsWebhookUrl?: string | null;
}

export interface PublishPublicFormScheduleInput {
  opensAt?: string | null;
  closesAt?: string | null;
}



export interface PublicFormCatalogItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string;
  sectionCount: number;
  questionCount: number;
}

export interface PublicFormView {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  definition: PublicFormDefinition;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string;
}

export interface SubmitPublicFormInput {
  respondentName?: string | null;
  respondentEmail?: string | null;
  answers: Record<string, unknown>;
}

export interface PublicFormSubmissionResult {
  id: string;
  submittedAt: string;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function validateSlug(slug: string): void {
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
      400,
    );
  }

  if (slug.length > 100) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Slug maksimal 100 karakter.',
      400,
    );
  }
}

function validateDraftTitle(
  definition: PublicFormDefinition,
): void {
  if (!definition.title.trim()) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Judul formulir wajib diisi.',
      400,
    );
  }
}


function normalizeTimestamp(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Tanggal dan waktu tidak valid.',
      400,
    );
  }

  return parsed.toISOString();
}

function normalizeGoogleSheetsWebhookUrl(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || !value.trim()) {
    return null;
  }

  const normalized = value.trim();

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== 'https:') {
      throw new Error('HTTPS wajib digunakan.');
    }
  } catch {
    throw new AppError(
      'VALIDATION_ERROR',
      'URL webhook Google Sheets harus berupa URL HTTPS yang valid.',
      400,
    );
  }

  return normalized;
}

function validateGoogleSheetsConfig(
  enabled: boolean,
  webhookUrl: string | null,
): void {
  if (enabled && !webhookUrl) {
    throw new AppError(
      'VALIDATION_ERROR',
      'URL webhook wajib diisi ketika sinkronisasi Google Sheets diaktifkan.',
      400,
    );
  }
}

function validateSchedule(
  opensAt: string | null,
  closesAt: string | null,
): void {
  if (
    opensAt &&
    closesAt &&
    new Date(closesAt).getTime() <=
      new Date(opensAt).getTime()
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Waktu berakhir harus setelah waktu mulai.',
      400,
    );
  }
}


function hasAnswer(
  value: unknown,
): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(
      value as Record<string, unknown>,
    ).some(hasAnswer);
  }

  return true;
}

export class PublicFormService {
  constructor(
    private readonly repo:
      PublicFormRepositoryPort,
    private readonly clock: ClockPort,
    private readonly sheetSync?:
      PublicFormSheetSyncPort,
  ) {}

  async list(
    query: PublicFormListQuery,
  ): Promise<Paginated<PublicFormRow>> {
    const { items, total } =
      await this.repo.list({
        search: query.search,
        status: query.status,
        limit: query.pageSize,
        offset: offsetOf(
          query.page,
          query.pageSize,
        ),
      });

    return buildPage(
      items,
      total,
      query.page,
      query.pageSize,
    );
  }

  async get(
    id: string,
  ): Promise<PublicFormRow> {
    const row =
      await this.repo.findById(id);

    if (!row) {
      throw new AppError(
        'NOT_FOUND',
        'Formulir tidak ditemukan.',
        404,
      );
    }

    return row;
  }

  async disconnectGoogleSheet(
    id: string,
  ): Promise<PublicFormRow> {
    const row = await this.get(id);

    const updatedAt =
      this.clock.now().toISOString();

    await this.repo.disconnectGoogleSheet(
      id,
      updatedAt,
    );

    return {
      ...row,
      googleSheetId: null,
      googleSheetUrl: null,
      googleSheetStatus:
        'NOT_CONNECTED',
      googleSheetConnectedAt: null,
      updatedAt,
    };
  }

  async createGoogleSheet(
    id: string,
  ): Promise<PublicFormRow> {
    const row = await this.get(id);

    if (
      row.googleSheetStatus ===
        'CONNECTED' &&
      row.googleSheetId &&
      row.googleSheetUrl
    ) {
      return row;
    }

    if (!this.sheetSync) {
      throw new AppError(
        'INTERNAL_ERROR',
        'Adapter Google Sheets belum tersedia.',
        500,
      );
    }

    let result: {
      sheetId: string;
      sheetUrl: string;
    };

    try {
      result =
        await this.sheetSync.createSheet({
          form: {
            id: row.id,
            slug: row.slug,
            title: row.title,
          },
          definition:
            row.draftDefinition,
        });
    } catch (caught) {
      throw new AppError(
        'INTERNAL_ERROR',
        caught instanceof Error
          ? caught.message
          : 'Google Sheet gagal dibuat.',
        500,
      );
    }

    const connectedAt =
      this.clock.now().toISOString();

    await this.repo.connectGoogleSheet(
      id,
      {
        sheetId: result.sheetId,
        sheetUrl: result.sheetUrl,
        connectedAt,
      },
    );

    return {
      ...row,
      googleSheetId:
        result.sheetId,
      googleSheetUrl:
        result.sheetUrl,
      googleSheetStatus:
        'CONNECTED',
      googleSheetConnectedAt:
        connectedAt,
      updatedAt:
        connectedAt,
    };
  }

  async create(
    input: CreatePublicFormInput,
    ctx: AdminContext,
  ): Promise<PublicFormRow> {
    validateDraftTitle(
      input.definition,
    );

    const slug =
      normalizeSlug(input.slug);

    validateSlug(slug);

    const duplicate =
      await this.repo.findBySlug(slug);

    if (duplicate) {
      throw new AppError(
        'CONFLICT',
        'Slug formulir sudah digunakan.',
        409,
      );
    }

    const googleSheetsEnabled =
      input.googleSheetsEnabled ?? false;

    const googleSheetsWebhookUrl =
      normalizeGoogleSheetsWebhookUrl(
        input.googleSheetsWebhookUrl,
      ) ?? null;

    validateGoogleSheetsConfig(
      googleSheetsEnabled,
      googleSheetsWebhookUrl,
    );

    const now =
      this.clock.now().toISOString();

    const row: PublicFormRow = {
      id: generateId('form'),
      slug,
      title:
        input.definition.title.trim(),
      description:
        input.definition.description.trim() ||
        null,
      status: 'DRAFT',
      draftDefinition:
        input.definition,
      publishedDefinition: null,
      opensAt: null,
      closesAt: null,
      publishedAt: null,
      googleSheetsEnabled,
      googleSheetsWebhookUrl,
      googleSheetId: null,
      googleSheetUrl: null,
      googleSheetStatus:
        'NOT_CONNECTED',
      googleSheetConnectedAt: null,
      createdBy: ctx.actor.id,
      createdAt: now,
      updatedAt: now,
    };

    await this.repo.insert({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      status: row.status,
      draftDefinition:
        row.draftDefinition,
      googleSheetsEnabled:
        row.googleSheetsEnabled,
      googleSheetsWebhookUrl:
        row.googleSheetsWebhookUrl,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });

    return row;
  }

  async updateDraft(
    id: string,
    input: UpdatePublicFormDraftInput,
  ): Promise<PublicFormRow> {
    const row = await this.get(id);

    const definition =
      input.definition ??
      row.draftDefinition;

    validateDraftTitle(definition);

    let slug = row.slug;

    if (input.slug !== undefined) {
      slug = normalizeSlug(input.slug);
      validateSlug(slug);

      const duplicate =
        await this.repo.findBySlug(slug);

      if (
        duplicate &&
        duplicate.id !== id
      ) {
        throw new AppError(
          'CONFLICT',
          'Slug formulir sudah digunakan.',
          409,
        );
      }
    }

    const normalizedOpensAt =
      normalizeTimestamp(input.opensAt);

    const normalizedClosesAt =
      normalizeTimestamp(input.closesAt);

    const opensAt =
      normalizedOpensAt === undefined
        ? row.opensAt
        : normalizedOpensAt;

    const closesAt =
      normalizedClosesAt === undefined
        ? row.closesAt
        : normalizedClosesAt;

    validateSchedule(
      opensAt,
      closesAt,
    );

    const normalizedWebhookUrl =
      normalizeGoogleSheetsWebhookUrl(
        input.googleSheetsWebhookUrl,
      );

    const googleSheetsEnabled =
      input.googleSheetsEnabled === undefined
        ? row.googleSheetsEnabled
        : input.googleSheetsEnabled;

    const googleSheetsWebhookUrl =
      normalizedWebhookUrl === undefined
        ? row.googleSheetsWebhookUrl
        : normalizedWebhookUrl;

    validateGoogleSheetsConfig(
      googleSheetsEnabled,
      googleSheetsWebhookUrl,
    );

    const now =
      this.clock.now().toISOString();

    await this.repo.updateDraft(id, {
      slug:
        input.slug === undefined
          ? undefined
          : slug,
      title:
        definition.title.trim(),
      description:
        definition.description.trim() ||
        null,
      draftDefinition: definition,
      opensAt: normalizedOpensAt,
      closesAt: normalizedClosesAt,
      googleSheetsEnabled:
        input.googleSheetsEnabled,
      googleSheetsWebhookUrl:
        normalizedWebhookUrl,
      updatedAt: now,
    });

    return {
      ...row,
      slug,
      title:
        definition.title.trim(),
      description:
        definition.description.trim() ||
        null,
      draftDefinition: definition,
      opensAt,
      closesAt,
      googleSheetsEnabled,
      googleSheetsWebhookUrl,
      updatedAt: now,
    };
  }

  async publish(
    id: string,
    input: PublishPublicFormScheduleInput,
  ): Promise<PublicFormRow> {
    const row = await this.get(id);

    validateDraftTitle(
      row.draftDefinition,
    );

    const normalizedOpensAt =
      normalizeTimestamp(input.opensAt);

    const normalizedClosesAt =
      normalizeTimestamp(input.closesAt);

    const opensAt =
      normalizedOpensAt === undefined
        ? row.opensAt
        : normalizedOpensAt;

    const closesAt =
      normalizedClosesAt === undefined
        ? row.closesAt
        : normalizedClosesAt;

    validateSchedule(
      opensAt,
      closesAt,
    );

    const now =
      this.clock.now().toISOString();

    await this.repo.publish(id, {
      publishedDefinition:
        row.draftDefinition,
      opensAt,
      closesAt,
      publishedAt: now,
      updatedAt: now,
    });

    return {
      ...row,
      status: 'PUBLISHED',
      publishedDefinition:
        row.draftDefinition,
      opensAt,
      closesAt,
      publishedAt: now,
      updatedAt: now,
    };
  }

  async unpublish(
    id: string,
  ): Promise<PublicFormRow> {
    const row = await this.get(id);

    const now =
      this.clock.now().toISOString();

    await this.repo.unpublish(
      id,
      now,
    );

    return {
      ...row,
      status: 'DRAFT',
      updatedAt: now,
    };
  }



  async deleteForm(
    id: string,
  ): Promise<{
    id: string;
  }> {
    await this.get(id);

    await this.repo.deleteById(id);

    return {
      id,
    };
  }

  async listPublicCatalog(): Promise<
    PublicFormCatalogItem[]
  > {
    const { items } =
      await this.repo.list({
        status: 'PUBLISHED',
        limit: 100,
        offset: 0,
      });

    const now =
      this.clock.now().getTime();

    return items
      .filter((row) => {
        if (
          !row.publishedDefinition ||
          !row.publishedAt
        ) {
          return false;
        }

        if (
          row.opensAt &&
          now <
            new Date(
              row.opensAt,
            ).getTime()
        ) {
          return false;
        }

        if (
          row.closesAt &&
          now >=
            new Date(
              row.closesAt,
            ).getTime()
        ) {
          return false;
        }

        return true;
      })
      .map((row) => {
        const definition =
          row.publishedDefinition as PublicFormDefinition;

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description:
            row.description,
          opensAt: row.opensAt,
          closesAt: row.closesAt,
          publishedAt:
            row.publishedAt as string,
          sectionCount:
            definition.sections.length,
          questionCount:
            definition.sections.reduce(
              (
                total,
                section,
              ) =>
                total +
                section.questions.length,
              0,
            ),
        };
      });
  }

  private async loadAvailablePublicForm(
    slug: string,
  ): Promise<PublicFormRow> {
    const normalizedSlug =
      normalizeSlug(slug);

    const row =
      await this.repo.findBySlug(
        normalizedSlug,
      );

    if (
      !row ||
      row.status !== 'PUBLISHED' ||
      !row.publishedDefinition ||
      !row.publishedAt
    ) {
      throw new AppError(
        'NOT_FOUND',
        'Formulir tidak ditemukan.',
        404,
      );
    }

    const now =
      this.clock.now().getTime();

    if (
      row.opensAt &&
      now < new Date(row.opensAt).getTime()
    ) {
      throw new AppError(
        'FORBIDDEN',
        'Formulir belum dibuka.',
        403,
      );
    }

    if (
      row.closesAt &&
      now >= new Date(row.closesAt).getTime()
    ) {
      throw new AppError(
        'FORBIDDEN',
        'Batas waktu pengisian formulir telah berakhir.',
        403,
      );
    }

    return row;
  }

  async getPublic(
    slug: string,
  ): Promise<PublicFormView> {
    const row =
      await this.loadAvailablePublicForm(
        slug,
      );

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      definition:
        row.publishedDefinition as PublicFormDefinition,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      publishedAt:
        row.publishedAt as string,
    };
  }

  async submitPublic(
    slug: string,
    input: SubmitPublicFormInput,
  ): Promise<PublicFormSubmissionResult> {
    const row =
      await this.loadAvailablePublicForm(
        slug,
      );

    const definition =
      row.publishedDefinition as PublicFormDefinition;

    for (const section of definition.sections) {
      for (const question of section.questions) {
        if (
          question.required &&
          !hasAnswer(
            input.answers[question.id],
          )
        ) {
          throw new AppError(
            'VALIDATION_ERROR',
            `Pertanyaan "${question.title || 'Tanpa judul'}" wajib diisi.`,
            400,
          );
        }
      }
    }

    const respondentName =
      input.respondentName?.trim() || null;

    const respondentEmail =
      input.respondentEmail
        ?.trim()
        .toLowerCase() || null;

    if (
      respondentEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        respondentEmail,
      )
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Alamat email tidak valid.',
        400,
      );
    }

    const submittedAt =
      this.clock.now().toISOString();

    const id =
      generateId('submission');

    await this.repo.insertSubmission({
      id,
      formId: row.id,
      respondentName,
      respondentEmail,
      answers: input.answers,
      status: 'SUBMITTED',
      sheetSyncStatus:
        row.googleSheetStatus ===
          'CONNECTED' &&
        Boolean(row.googleSheetId)
          ? 'PENDING'
          : 'NOT_CONFIGURED',
      sheetSyncAttempts: 0,
      sheetSyncedAt: null,
      sheetSyncError: null,
      submittedAt,
    });

    if (
      row.googleSheetStatus ===
        'CONNECTED' &&
      row.googleSheetId
    ) {
      let syncStatus:
        | 'SYNCED'
        | 'FAILED' = 'FAILED';

      let syncedAt: string | null = null;
      let syncError: string | null = null;

      try {
        if (!this.sheetSync) {
          throw new Error(
            'Adapter sinkronisasi Google Sheets belum tersedia.',
          );
        }

        await this.sheetSync.sync({
          sheetId:
            row.googleSheetId,
          form: {
            id: row.id,
            slug: row.slug,
            title: row.title,
          },
          submission: {
            id,
            submittedAt,
            respondentName,
            respondentEmail,
            answers: input.answers,
          },
          definition,
        });

        syncStatus = 'SYNCED';
        syncedAt =
          this.clock.now().toISOString();
      } catch (caught) {
        syncError = (
          caught instanceof Error
            ? caught.message
            : 'Sinkronisasi Google Sheets gagal.'
        ).slice(0, 2000);
      }

      try {
        await this.repo
          .completeSubmissionSheetSyncAttempt(
            id,
            {
              status: syncStatus,
              syncedAt,
              error: syncError,
            },
          );
      } catch {
        // Submission utama sudah tersimpan.
        // Kegagalan pencatatan status sync
        // tidak boleh menggagalkan respons peserta.
      }
    }

    return {
      id,
      submittedAt,
    };
  }

}

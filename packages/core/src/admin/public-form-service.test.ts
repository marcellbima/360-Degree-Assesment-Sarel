import { describe, expect, it } from 'vitest';

import type { ClockPort } from '../ports/clock';
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
} from '../ports/public-form-repository';
import { PublicFormService } from './public-form-service';
import type { AdminContext } from './types';

const ADMIN_CONTEXT: AdminContext = {
  actor: {
    id: 'user_super',
    userId: 'superadmin',
    roles: ['SUPERADMIN'],
    permissions: [],
  },
  ip: '127.0.0.1',
  userAgent: null,
  requestId: 'req_public_form',
};

const FORM_DEFINITION: PublicFormDefinition = {
  title: 'Form Assessment',
  description: 'Form untuk pengujian.',
  sections: [],
};

class FixedClock implements ClockPort {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value;
  }
}

class FakePublicFormRepository implements PublicFormRepositoryPort {
  readonly rows = new Map<string, PublicFormRow>();

  readonly publishCalls: Array<{
    id: string;
    input: PublishPublicFormInput;
  }> = [];

  deleteAllowed = true;

  seed(row: PublicFormRow): void {
    this.rows.set(row.id, row);
  }

  async list(filter: PublicFormListFilter): Promise<{
    items: PublicFormRow[];
    total: number;
  }> {
    let items = [...this.rows.values()];

    if (filter.search) {
      const search = filter.search.toLowerCase();

      items = items.filter((row) => row.title.toLowerCase().includes(search));
    }

    if (filter.status) {
      items = items.filter((row) => row.status === filter.status);
    }

    const total = items.length;

    return {
      items: items.slice(filter.offset, filter.offset + filter.limit),
      total,
    };
  }

  async findById(id: string): Promise<PublicFormRow | null> {
    return this.rows.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<PublicFormRow | null> {
    return [...this.rows.values()].find((row) => row.slug === slug) ?? null;
  }

  async insert(row: NewPublicForm): Promise<void> {
    this.rows.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      status: row.status,
      draftDefinition: row.draftDefinition,
      publishedDefinition: null,
      opensAt: null,
      closesAt: null,
      publishedAt: null,
      googleSheetsEnabled: row.googleSheetsEnabled,
      googleSheetsWebhookUrl: row.googleSheetsWebhookUrl,
      googleSheetId: null,
      googleSheetUrl: null,
      googleSheetStatus: 'NOT_CONNECTED',
      googleSheetConnectedAt: null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async updateDraft(id: string, patch: PublicFormDraftPatch): Promise<void> {
    const row = this.rows.get(id);

    if (!row) {
      return;
    }

    this.rows.set(id, {
      ...row,
      slug: patch.slug ?? row.slug,
      title: patch.title ?? row.title,
      description: patch.description === undefined ? row.description : patch.description,
      draftDefinition: patch.draftDefinition ?? row.draftDefinition,
      opensAt: patch.opensAt === undefined ? row.opensAt : patch.opensAt,
      closesAt: patch.closesAt === undefined ? row.closesAt : patch.closesAt,
      googleSheetsEnabled: patch.googleSheetsEnabled ?? row.googleSheetsEnabled,
      googleSheetsWebhookUrl:
        patch.googleSheetsWebhookUrl === undefined
          ? row.googleSheetsWebhookUrl
          : patch.googleSheetsWebhookUrl,
      updatedAt: patch.updatedAt,
    });
  }

  async publish(id: string, input: PublishPublicFormInput): Promise<PublicFormVersionRow> {
    this.publishCalls.push({
      id,
      input,
    });

    const row = this.rows.get(id);

    if (row) {
      this.rows.set(id, {
        ...row,
        status: 'PUBLISHED',
        publishedDefinition: input.publishedDefinition,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
        publishedAt: input.publishedAt,
        updatedAt: input.updatedAt,
      });
    }

    return {
      id: input.versionId,
      publicFormId: id,
      versionNumber: this.publishCalls.length,
      definition: input.publishedDefinition,
      publishedAt: input.publishedAt,
      createdBy: input.createdBy,
      createdAt: input.publishedAt,
    };
  }

  async unpublish(id: string, updatedAt: string): Promise<void> {
    const row = this.rows.get(id);

    if (row) {
      this.rows.set(id, {
        ...row,
        status: 'DRAFT',
        updatedAt,
      });
    }
  }

  async connectGoogleSheet(id: string, input: ConnectPublicFormGoogleSheetInput): Promise<void> {
    const row = this.rows.get(id);

    if (row) {
      this.rows.set(id, {
        ...row,
        googleSheetId: input.sheetId,
        googleSheetUrl: input.sheetUrl,
        googleSheetStatus: 'CONNECTED',
        googleSheetConnectedAt: input.connectedAt,
        updatedAt: input.connectedAt,
      });
    }
  }

  async disconnectGoogleSheet(id: string, updatedAt: string): Promise<void> {
    const row = this.rows.get(id);

    if (row) {
      this.rows.set(id, {
        ...row,
        googleSheetId: null,
        googleSheetUrl: null,
        googleSheetStatus: 'NOT_CONNECTED',
        googleSheetConnectedAt: null,
        updatedAt,
      });
    }
  }

  async deleteById(id: string): Promise<boolean> {
    if (!this.deleteAllowed) {
      return false;
    }

    return this.rows.delete(id);
  }

  async insertSubmission(row: NewPublicFormSubmission): Promise<void> {
    void row;
  }

  async completeSubmissionSheetSyncAttempt(
    id: string,
    input: CompletePublicFormSheetSyncAttemptInput,
  ): Promise<void> {
    void id;
    void input;
  }
}

function makeFormRow(): PublicFormRow {
  return {
    id: 'form_1',
    slug: 'form-assessment',
    title: FORM_DEFINITION.title,
    description: FORM_DEFINITION.description,
    status: 'DRAFT',
    draftDefinition: FORM_DEFINITION,
    publishedDefinition: null,
    opensAt: null,
    closesAt: null,
    publishedAt: null,
    googleSheetsEnabled: false,
    googleSheetsWebhookUrl: null,
    googleSheetId: null,
    googleSheetUrl: null,
    googleSheetStatus: 'NOT_CONNECTED',
    googleSheetConnectedAt: null,
    createdBy: 'user_creator',
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  };
}

function setup(): {
  service: PublicFormService;
  repository: FakePublicFormRepository;
} {
  const repository = new FakePublicFormRepository();

  repository.seed(makeFormRow());

  const clock = new FixedClock(new Date('2026-07-20T01:02:03.000Z'));

  return {
    service: new PublicFormService(repository, clock),
    repository,
  };
}

describe('PublicFormService versioning', () => {
  it('Publish mengirim snapshot, actor, dan jadwal ISO ke repository', async () => {
    const { service, repository } = setup();

    const result = await service.publish(
      'form_1',
      {
        opensAt: '2026-07-21T08:00:00+07:00',
        closesAt: '2026-07-22T08:00:00+07:00',
      },
      ADMIN_CONTEXT,
    );

    expect(repository.publishCalls).toHaveLength(1);

    const call = repository.publishCalls[0];

    expect(call?.id).toBe('form_1');

    expect(call?.input.versionId).toMatch(/^pfv_/);

    expect(call?.input.createdBy).toBe('user_super');

    expect(call?.input.publishedDefinition).toEqual(FORM_DEFINITION);

    expect(call?.input.opensAt).toBe('2026-07-21T01:00:00.000Z');

    expect(call?.input.closesAt).toBe('2026-07-22T01:00:00.000Z');

    expect(call?.input.publishedAt).toBe('2026-07-20T01:02:03.000Z');

    expect(result.status).toBe('PUBLISHED');

    expect(result.publishedDefinition).toEqual(FORM_DEFINITION);
  });

  it('setiap Publish membuat ID versi baru', async () => {
    const { service, repository } = setup();

    await service.publish('form_1', {}, ADMIN_CONTEXT);

    await service.publish('form_1', {}, ADMIN_CONTEXT);

    expect(repository.publishCalls).toHaveLength(2);

    expect(repository.publishCalls[0]?.input.versionId).not.toBe(
      repository.publishCalls[1]?.input.versionId,
    );
  });

  it('jadwal tidak valid ditolak sebelum repository dipanggil', async () => {
    const { service, repository } = setup();

    await expect(
      service.publish(
        'form_1',
        {
          opensAt: '2026-07-22T08:00:00+07:00',
          closesAt: '2026-07-21T08:00:00+07:00',
        },
        ADMIN_CONTEXT,
      ),
    ).rejects.toMatchObject({
      httpStatus: 400,
    });

    expect(repository.publishCalls).toHaveLength(0);
  });

  it('form dengan versi historis tidak dapat dihapus', async () => {
    const { service, repository } = setup();

    repository.deleteAllowed = false;

    await expect(service.deleteForm('form_1')).rejects.toMatchObject({
      code: 'CONFLICT',
      httpStatus: 409,
    });

    expect(repository.rows.has('form_1')).toBe(true);
  });

  it('form draft tanpa versi dapat dihapus', async () => {
    const { service, repository } = setup();

    const result = await service.deleteForm('form_1');

    expect(result).toEqual({
      id: 'form_1',
    });

    expect(repository.rows.has('form_1')).toBe(false);
  });
});

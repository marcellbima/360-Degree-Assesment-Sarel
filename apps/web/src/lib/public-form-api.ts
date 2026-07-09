import type {
  Paginated,
  PublicFormDefinitionInput,
} from '@sarel/shared';

import {
  apiQueryString,
  apiRequest,
} from './api';

export type PublicFormStatus =
  | 'DRAFT'
  | 'PUBLISHED';

export interface PublicFormRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: PublicFormStatus;
  draftDefinition:
    PublicFormDefinitionInput;
  publishedDefinition:
    | PublicFormDefinitionInput
    | null;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  googleSheetsEnabled: boolean;
  googleSheetsWebhookUrl: string | null;
  googleSheetId: string | null;
  googleSheetUrl: string | null;
  googleSheetStatus:
    | 'NOT_CONNECTED'
    | 'CONNECTED'
    | 'ERROR';
  googleSheetConnectedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  definition:
    PublicFormDefinitionInput;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string;
}

export interface PublicFormListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: PublicFormStatus;
}

export interface CreatePublicFormRequest {
  slug: string;
  definition:
    PublicFormDefinitionInput;
  googleSheetsEnabled?: boolean;
  googleSheetsWebhookUrl?: string | null;
}

export interface UpdatePublicFormRequest {
  slug?: string;
  definition?:
    PublicFormDefinitionInput;
  opensAt?: string | null;
  closesAt?: string | null;
  googleSheetsEnabled?: boolean;
  googleSheetsWebhookUrl?: string | null;
}

export interface PublishPublicFormRequest {
  opensAt?: string | null;
  closesAt?: string | null;
}

export interface SubmitPublicFormRequest {
  respondentName?: string | null;
  respondentEmail?: string | null;
  answers: Record<string, unknown>;
}

export interface PublicFormSubmissionResult {
  id: string;
  submittedAt: string;
}

function formPath(id: string): string {
  return `/api/admin/public-forms/${encodeURIComponent(id)}`;
}

function publicFormPath(
  slug: string,
): string {
  return `/api/public/forms/${encodeURIComponent(slug)}`;
}

export const publicFormAdminApi = {
  list(
    params: PublicFormListParams = {},
  ): Promise<
    Paginated<PublicFormRecord>
  > {
    return apiRequest(
      `/api/admin/public-forms${apiQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
      })}`,
    );
  },

  get(
    id: string,
  ): Promise<PublicFormRecord> {
    return apiRequest(formPath(id));
  },

  create(
    body: CreatePublicFormRequest,
  ): Promise<PublicFormRecord> {
    return apiRequest(
      '/api/admin/public-forms',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  update(
    id: string,
    body: UpdatePublicFormRequest,
  ): Promise<PublicFormRecord> {
    return apiRequest(
      formPath(id),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    );
  },

  createGoogleSheet(
    id: string,
  ): Promise<PublicFormRecord> {
    return apiRequest(
      `${formPath(id)}/google-sheet`,
      {
        method: 'POST',
      },
    );
  },

  disconnectGoogleSheet(
    id: string,
  ): Promise<PublicFormRecord> {
    return apiRequest(
      `${formPath(id)}/google-sheet/disconnect`,
      {
        method: 'POST',
      },
    );
  },

  publish(
    id: string,
    body: PublishPublicFormRequest = {},
  ): Promise<PublicFormRecord> {
    return apiRequest(
      `${formPath(id)}/publish`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },

  unpublish(
    id: string,
  ): Promise<PublicFormRecord> {
    return apiRequest(
      `${formPath(id)}/unpublish`,
      {
        method: 'POST',
      },
    );
  },

  remove(
    id: string,
  ): Promise<{
    id: string;
  }> {
    return apiRequest(
      formPath(id),
      {
        method: 'DELETE',
      },
    );
  },
};

export const publicFormPublicApi = {
  list(): Promise<PublicFormCatalogItem[]> {
    return apiRequest('/api/public/forms');
  },

  get(
    slug: string,
  ): Promise<PublicFormView> {
    return apiRequest(
      publicFormPath(slug),
    );
  },

  submit(
    slug: string,
    body: SubmitPublicFormRequest,
  ): Promise<PublicFormSubmissionResult> {
    return apiRequest(
      `${publicFormPath(slug)}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  },
};

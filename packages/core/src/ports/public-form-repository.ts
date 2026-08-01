export type PublicFormQuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multiple_choice'
  | 'scale'
  | 'grid'
  | 'title_description';

export type PublicFormSheetSyncStatus =
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'SYNCED'
  | 'FAILED';

export type PublicFormGoogleSheetStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTED'
  | 'ERROR';

export interface PublicFormQuestion {
  id: string;
  title: string;
  description: string;
  type: PublicFormQuestionType;
  required: boolean;
  showOptionLabels?: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  gridRows: string[];
}

export interface PublicFormSection {
  id: string;
  title: string;
  description: string;
  questions: PublicFormQuestion[];
}

export interface PublicFormDefinition {
  title: string;
  description: string;
  sections: PublicFormSection[];
}

export interface PublicFormRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  draftDefinition: PublicFormDefinition;
  publishedDefinition:
    | PublicFormDefinition
    | null;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  googleSheetsEnabled: boolean;
  googleSheetsWebhookUrl: string | null;
  googleSheetId: string | null;
  googleSheetUrl: string | null;
  googleSheetStatus:
    PublicFormGoogleSheetStatus;
  googleSheetConnectedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFormVersionRow {
  id: string;
  publicFormId: string;
  versionNumber: number;
  definition: PublicFormDefinition;
  publishedAt: string;
  createdBy: string;
  createdAt: string;
}

export interface PublicFormListFilter {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
}

export interface NewPublicForm {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  draftDefinition: PublicFormDefinition;
  googleSheetsEnabled: boolean;
  googleSheetsWebhookUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFormDraftPatch {
  slug?: string;
  title?: string;
  description?: string | null;
  draftDefinition?: PublicFormDefinition;
  opensAt?: string | null;
  closesAt?: string | null;
  googleSheetsEnabled?: boolean;
  googleSheetsWebhookUrl?: string | null;
  updatedAt: string;
}

export interface PublishPublicFormInput {
  versionId: string;
  publishedDefinition:
    PublicFormDefinition;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PublicFormSubmissionRow {
  id: string;
  formId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: Record<string, unknown>;
  status: string;
  sheetSyncStatus: PublicFormSheetSyncStatus;
  sheetSyncAttempts: number;
  sheetSyncedAt: string | null;
  sheetSyncError: string | null;
  submittedAt: string;
}

export interface NewPublicFormSubmission {
  id: string;
  formId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: Record<string, unknown>;
  status: string;
  sheetSyncStatus: PublicFormSheetSyncStatus;
  sheetSyncAttempts: number;
  sheetSyncedAt: string | null;
  sheetSyncError: string | null;
  submittedAt: string;
}

export interface CompletePublicFormSheetSyncAttemptInput {
  status: 'SYNCED' | 'FAILED';
  syncedAt: string | null;
  error: string | null;
}

export interface ConnectPublicFormGoogleSheetInput {
  sheetId: string;
  sheetUrl: string;
  connectedAt: string;
}

export interface PublicFormRepositoryPort {
  list(
    filter: PublicFormListFilter,
  ): Promise<{
    items: PublicFormRow[];
    total: number;
  }>;

  findById(
    id: string,
  ): Promise<PublicFormRow | null>;

  findBySlug(
    slug: string,
  ): Promise<PublicFormRow | null>;

  insert(
    row: NewPublicForm,
  ): Promise<void>;

  updateDraft(
    id: string,
    patch: PublicFormDraftPatch,
  ): Promise<void>;

  publish(
    id: string,
    input: PublishPublicFormInput,
  ): Promise<PublicFormVersionRow>;

  unpublish(
    id: string,
    updatedAt: string,
  ): Promise<void>;

  connectGoogleSheet(
    id: string,
    input: ConnectPublicFormGoogleSheetInput,
  ): Promise<void>;

  disconnectGoogleSheet(
    id: string,
    updatedAt: string,
  ): Promise<void>;

  deleteById(
    id: string,
  ): Promise<boolean>;

  insertSubmission(
    row: NewPublicFormSubmission,
  ): Promise<void>;

  completeSubmissionSheetSyncAttempt(
    id: string,
    input: CompletePublicFormSheetSyncAttemptInput,
  ): Promise<void>;
}

import type {
  PublicFormDefinition,
} from './public-form-repository';

export interface CreatePublicFormGoogleSheetInput {
  form: {
    id: string;
    slug: string;
    title: string;
  };

  definition: PublicFormDefinition;
}

export interface CreatePublicFormGoogleSheetResult {
  sheetId: string;
  sheetUrl: string;
}

export interface PublicFormSheetSyncInput {
  sheetId: string;

  form: {
    id: string;
    slug: string;
    title: string;
  };

  submission: {
    id: string;
    submittedAt: string;
    respondentName: string | null;
    respondentEmail: string | null;
    answers: Record<string, unknown>;
  };

  definition: PublicFormDefinition;
}

export interface PublicFormSheetSyncPort {
  createSheet(
    input: CreatePublicFormGoogleSheetInput,
  ): Promise<CreatePublicFormGoogleSheetResult>;

  sync(
    input: PublicFormSheetSyncInput,
  ): Promise<void>;
}

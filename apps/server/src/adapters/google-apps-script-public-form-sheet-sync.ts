import type {
  CreatePublicFormGoogleSheetInput,
  CreatePublicFormGoogleSheetResult,
  PublicFormSheetSyncInput,
  PublicFormSheetSyncPort,
} from '@sarel/core';

interface GoogleAppsScriptResponse {
  ok?: boolean;
  error?: string;
  sheetId?: string;
  sheetUrl?: string;
}

export class GoogleAppsScriptPublicFormSheetSync
  implements PublicFormSheetSyncPort
{
  constructor(
    private readonly webAppUrl: string,
    private readonly secret: string,
    private readonly timeoutMs = 60_000,
  ) {}

  async createSheet(
    input: CreatePublicFormGoogleSheetInput,
  ): Promise<CreatePublicFormGoogleSheetResult> {
    const result = await this.request({
      version: 1,
      action: 'create_sheet',
      form: input.form,
      definition: input.definition,
    });

    if (
      !result.sheetId ||
      !result.sheetUrl
    ) {
      throw new Error(
        'Apps Script tidak mengembalikan ID dan URL Google Sheet.',
      );
    }

    return {
      sheetId: result.sheetId,
      sheetUrl: result.sheetUrl,
    };
  }

  async sync(
    input: PublicFormSheetSyncInput,
  ): Promise<void> {
    await this.request({
      version: 1,
      action: 'append_submission',
      sheetId: input.sheetId,
      form: input.form,
      submission: input.submission,
      definition: input.definition,
    });
  }

  private async request(
    payload: Record<string, unknown>,
  ): Promise<GoogleAppsScriptResponse> {
    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    try {
      const url =
        new URL(this.webAppUrl);

      url.searchParams.set(
        'token',
        this.secret,
      );

      const initialResponse =
        await fetch(
          url,
          {
            method: 'POST',
            headers: {
              'content-type':
                'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
            redirect: 'manual',
          },
        );

      let response = initialResponse;

      if (
        initialResponse.status >= 300 &&
        initialResponse.status < 400
      ) {
        const location =
          initialResponse.headers.get(
            'location',
          );

        if (!location) {
          throw new Error(
            'Apps Script mengembalikan redirect tanpa URL tujuan.',
          );
        }

        response = await fetch(
          new URL(
            location,
            url,
          ),
          {
            method: 'GET',
            signal: controller.signal,
          },
        );
      }

      const responseText =
        (await response.text()).trim();

      if (!response.ok) {
        throw new Error(
          `Apps Script merespons HTTP ${response.status}: ${responseText.slice(0, 1000)}`,
        );
      }

      let result:
        GoogleAppsScriptResponse;

      try {
        result = JSON.parse(
          responseText,
        ) as GoogleAppsScriptResponse;
      } catch {
        throw new Error(
          'Apps Script tidak mengembalikan JSON yang valid.',
        );
      }

      if (result.ok !== true) {
        throw new Error(
          result.error ||
            'Permintaan Google Sheets gagal.',
        );
      }

      return result;
    } catch (caught) {
      if (
        caught instanceof Error &&
        caught.name === 'AbortError'
      ) {
        throw new Error(
          'Permintaan Google Sheets melewati batas waktu.',
        );
      }

      throw caught;
    } finally {
      clearTimeout(timeout);
    }
  }
}

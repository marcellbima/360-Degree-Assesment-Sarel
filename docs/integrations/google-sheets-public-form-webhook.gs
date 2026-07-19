const BASE_HEADERS = [
  'Submission ID',
  'Submitted At',
  'Respondent Name',
  'Respondent Email',
];

function doPost(e) {
  try {
    validateToken_(e);

    const payload = JSON.parse(
      e.postData.contents || '{}',
    );

    let result;

    if (payload.action === 'create_sheet') {
      result = createSheet_(payload);
    } else if (
      payload.action === 'append_submission'
    ) {
      result = appendSubmission_(payload);
    } else {
      throw new Error(
        'Action belum didukung.',
      );
    }

    return json_({
      ok: true,
      ...result,
    });
  } catch (error) {
    return json_({
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}

function validateToken_(e) {
  const expected =
    PropertiesService
      .getScriptProperties()
      .getProperty('WEBHOOK_SECRET');

  const received =
    e.parameter.token || '';

  if (!expected) {
    throw new Error(
      'WEBHOOK_SECRET belum diisi.',
    );
  }

  if (received !== expected) {
    throw new Error(
      'Token webhook tidak valid.',
    );
  }
}

function createSheet_(payload) {
  if (
    !payload.form ||
    !payload.definition
  ) {
    throw new Error(
      'Data form tidak lengkap.',
    );
  }

  const title =
    payload.form.title ||
    payload.form.slug ||
    'Form';

  const spreadsheet =
    SpreadsheetApp.create(
      ('Responses - ' + title)
        .slice(0, 180),
    );

  const sheet =
    spreadsheet.getSheets()[0];

  sheet.setName('Responses');

  const headers =
    BASE_HEADERS.concat(
      collectQuestionHeaders_(
        payload.definition,
      ),
    );

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length,
    )
    .setValues([headers])
    .setFontWeight('bold');

  sheet.setFrozenRows(1);

  return {
    sheetId: spreadsheet.getId(),
    sheetUrl: spreadsheet.getUrl(),
  };
}

function collectQuestionHeaders_(
  definition,
) {
  const headers = [];

  definition.sections.forEach(
    function (section) {
      section.questions.forEach(
        function (question) {
          headers.push(
            String(
              question.title ||
                'Tanpa judul',
            ).trim(),
          );
        },
      );
    },
  );

  return headers;
}

function json_(body) {
  return ContentService
    .createTextOutput(
      JSON.stringify(body),
    )
    .setMimeType(
      ContentService.MimeType.JSON,
    );
}


function appendSubmission_(payload) {
  if (!payload.sheetId) {
    throw new Error(
      'Google Sheet ID tidak tersedia.',
    );
  }

  if (
    !payload.submission ||
    !payload.submission.id
  ) {
    throw new Error(
      'Data submission tidak lengkap.',
    );
  }

  const spreadsheet =
    SpreadsheetApp.openById(
      payload.sheetId,
    );

  const sheet =
    spreadsheet.getSheetByName(
      'Responses',
    ) || spreadsheet.getSheets()[0];

  const questionHeaders =
    collectQuestionHeaders_(
      payload.definition,
    );

  const existingHeaders =
    sheet
      .getRange(
        1,
        1,
        1,
        sheet.getLastColumn(),
      )
      .getValues()[0]
      .map(cleanHeader_);

  const headers =
    existingHeaders.slice();

  questionHeaders.forEach(
    function (header) {
      if (!headers.includes(header)) {
        headers.push(header);
      }
    },
  );

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length,
    )
    .setValues([headers])
    .setFontWeight('bold');

  const values = {
    'Submission ID':
      payload.submission.id,

    'Submitted At':
      payload.submission.submittedAt,

    'Respondent Name':
      payload.submission.respondentName || '',

    'Respondent Email':
      payload.submission.respondentEmail || '',
  };

  payload.definition.sections.forEach(
    function (section) {
      section.questions.forEach(
        function (question) {
          const header =
            String(
              question.title ||
                'Tanpa judul',
            ).trim();

          values[header] =
            formatAnswer_(
              payload.submission
                .answers[question.id],
            );
        },
      );
    },
  );

  sheet.appendRow(
    headers.map(
      function (header) {
        return values[header] ?? '';
      },
    ),
  );

  return {
    sheetId: spreadsheet.getId(),
    sheetUrl: spreadsheet.getUrl(),
    submissionId:
      payload.submission.id,
  };
}

function cleanHeader_(value) {
  return String(value)
    .replace(
      /\s+\[[^\]]+\]$/,
      '',
    )
    .trim();
}

function formatAnswer_(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map(formatAnswer_)
      .join(' | ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(
        function ([key, item]) {
          return (
            key +
            ': ' +
            formatAnswer_(item)
          );
        },
      )
      .join(' | ');
  }

  return String(value);
}

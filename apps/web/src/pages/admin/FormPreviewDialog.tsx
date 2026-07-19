export type PreviewQuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multiple_choice'
  | 'scale'
  | 'grid'
  | 'title_description';

export interface PreviewQuestion {
  id: string;
  title: string;
  description: string;
  type: PreviewQuestionType;
  required: boolean;
  options: string[];
  scaleMin: number;
  scaleMax: number;
  scaleMinLabel: string;
  scaleMaxLabel: string;
  gridRows: string[];
}

export interface PreviewSection {
  id: string;
  title: string;
  description: string;
  questions: PreviewQuestion[];
}

export interface PreviewFormDefinition {
  title: string;
  description: string;
  sections: PreviewSection[];
}

function numberRange(
  minimum: number,
  maximum: number,
): number[] {
  return Array.from(
    {
      length:
        Math.max(0, maximum - minimum) + 1,
    },
    (_, index) => minimum + index,
  );
}

function QuestionPreview({
  question,
  number,
}: {
  question: PreviewQuestion;
  number: number;
}): JSX.Element {
  const title =
    question.title.trim() ||
    `Pertanyaan ${number}`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-medium text-slate-800">
        {number}. {title}
        {question.required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </p>

      {question.description ? (
        <p className="mt-1 text-sm text-slate-500">
          {question.description}
        </p>
      ) : null}

      <div className="mt-5">
        {question.type ===
        'title_description' ? null
        : question.type === 'short_text' ? (
          <input
            disabled
            placeholder="Jawaban Anda"
            className="w-full max-w-lg border-b border-slate-300 bg-transparent py-2 text-sm outline-none"
          />
        ) : question.type === 'paragraph' ? (
          <textarea
            disabled
            rows={4}
            placeholder="Jawaban Anda"
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        ) : question.type ===
            'single_choice' ||
          question.type ===
            'multiple_choice' ? (
          <div className="space-y-3">
            {question.options.map(
              (option, optionIndex) => (
                <label
                  key={`${question.id}-${optionIndex}`}
                  className="flex items-center gap-3 text-sm text-slate-700"
                >
                  <input
                    disabled
                    type={
                      question.type ===
                      'single_choice'
                        ? 'radio'
                        : 'checkbox'
                    }
                    name={question.id}
                  />

                  <span>
                    {option.trim() ||
                      `Opsi ${optionIndex + 1}`}
                  </span>
                </label>
              ),
            )}
          </div>
        ) : question.type === 'scale' ? (
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-end gap-5">
              <span className="max-w-32 text-xs text-slate-500">
                {question.scaleMinLabel}
              </span>

              {numberRange(
                question.scaleMin,
                question.scaleMax,
              ).map((value) => (
                <label
                  key={value}
                  className="flex flex-col items-center gap-2 text-sm text-slate-600"
                >
                  <span>{value}</span>
                  <input
                    disabled
                    type="radio"
                    name={question.id}
                  />
                </label>
              ))}

              <span className="max-w-32 text-xs text-slate-500">
                {question.scaleMaxLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2" />

                  {question.options.map(
                    (column, columnIndex) => (
                      <th
                        key={`${question.id}-column-${columnIndex}`}
                        className="px-3 py-2 text-center font-medium text-slate-600"
                      >
                        {column.trim() ||
                          `Kolom ${columnIndex + 1}`}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {question.gridRows.map(
                  (row, rowIndex) => (
                    <tr
                      key={`${question.id}-row-${rowIndex}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-3 text-slate-700">
                        {row.trim() ||
                          `Baris ${rowIndex + 1}`}
                      </td>

                      {question.options.map(
                        (_, columnIndex) => (
                          <td
                            key={`${question.id}-${rowIndex}-${columnIndex}`}
                            className="px-3 py-3 text-center"
                          >
                            <input
                              disabled
                              type="radio"
                              name={`${question.id}-${rowIndex}`}
                            />
                          </td>
                        ),
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}

export function FormPreviewDialog({
  form,
  onClose,
}: {
  form: PreviewFormDefinition;
  onClose: () => void;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4">
      <div className="mx-auto max-w-4xl space-y-5 py-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow hover:bg-slate-100"
          >
            Tutup preview
          </button>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="h-3 rounded-t-2xl bg-blue-600" />

          <div className="p-6">
            <h1 className="text-2xl font-semibold text-slate-800">
              {form.title.trim() ||
                'Formulir tanpa judul'}
            </h1>

            {form.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                {form.description}
              </p>
            ) : null}

            <p className="mt-4 text-xs text-red-500">
              * Wajib diisi
            </p>
          </div>
        </div>

        {form.sections.map(
          (section, sectionIndex) => (
            <section
              key={section.id}
              className="space-y-3"
            >
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  Bagian {sectionIndex + 1}
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-800">
                  {section.title.trim() ||
                    `Bagian ${sectionIndex + 1}`}
                </h2>

                {section.description ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {section.description}
                  </p>
                ) : null}
              </div>

              {section.questions.map(
                (question, questionIndex) => (
                  <QuestionPreview
                    key={question.id}
                    question={question}
                    number={questionIndex + 1}
                  />
                ),
              )}
            </section>
          ),
        )}

        <button
          type="button"
          disabled
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white opacity-70"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}

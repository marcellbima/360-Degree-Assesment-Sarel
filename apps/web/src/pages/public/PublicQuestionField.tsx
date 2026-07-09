import type {
  PublicFormDefinitionInput,
} from '@sarel/shared';

type PublicQuestion =
  PublicFormDefinitionInput['sections'][number]['questions'][number];

interface PublicQuestionFieldProps {
  question: PublicQuestion;
  answer: unknown;
  onChange: (value: unknown) => void;
}

function numberRange(
  minimum: number,
  maximum: number,
): number[] {
  return Array.from(
    {
      length:
        Math.max(
          0,
          maximum - minimum,
        ) + 1,
    },
    (_, index) =>
      minimum + index,
  );
}

function optionLabel(
  index: number,
): string {
  let value = index + 1;
  let result = '';

  while (value > 0) {
    value -= 1;

    result =
      String.fromCharCode(
        65 + (value % 26),
      ) + result;

    value = Math.floor(
      value / 26,
    );
  }

  return result;
}

function optionValue(
  option: string,
  index: number,
): string {
  return (
    option.trim() ||
    `Opsi ${index + 1}`
  );
}

function ChoiceIndicator({
  selected,
  multiple,
}: {
  selected: boolean;
  multiple: boolean;
}): JSX.Element {
  if (multiple) {
    return (
      <span
        className={
          selected
            ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white'
            : 'h-6 w-6 shrink-0 rounded-md border-2 border-slate-300 bg-white'
        }
      >
        {selected ? '✓' : ''}
      </span>
    );
  }

  return (
    <span
      className={
        selected
          ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50'
          : 'h-6 w-6 shrink-0 rounded-full border-2 border-blue-300 bg-white'
      }
    >
      {selected ? (
        <span className="h-3 w-3 rounded-full bg-blue-600" />
      ) : null}
    </span>
  );
}

export function PublicQuestionField({
  question,
  answer,
  onChange,
}: PublicQuestionFieldProps): JSX.Element {
  const selectedValues =
    Array.isArray(answer)
      ? answer.filter(
          (value): value is string =>
            typeof value === 'string',
        )
      : [];

  const gridValue =
    answer &&
    typeof answer === 'object' &&
    !Array.isArray(answer)
      ? answer as Record<
          string,
          string
        >
      : {};

  if (question.type === 'short_text') {
    return (
      <input
        value={
          typeof answer === 'string'
            ? answer
            : ''
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="Ketik jawaban Anda"
        className="w-full rounded-xl border border-blue-300 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    );
  }

  if (question.type === 'paragraph') {
    return (
      <textarea
        value={
          typeof answer === 'string'
            ? answer
            : ''
        }
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={5}
        placeholder="Ketik jawaban Anda"
        className="w-full resize-y rounded-xl border border-blue-300 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    );
  }

  if (
    question.type ===
      'single_choice' ||
    question.type ===
      'multiple_choice'
  ) {
    const multiple =
      question.type ===
      'multiple_choice';

    const showLabels =
      question.showOptionLabels ??
      false;

    return (
      <div className="space-y-3">
        {question.options.map(
          (option, optionIndex) => {
            const value =
              optionValue(
                option,
                optionIndex,
              );

            const selected =
              multiple
                ? selectedValues.includes(
                    value,
                  )
                : answer === value;

            function choose(): void {
              if (multiple) {
                onChange(
                  selected
                    ? selectedValues.filter(
                        (item) =>
                          item !== value,
                      )
                    : [
                        ...selectedValues,
                        value,
                      ],
                );

                return;
              }

              onChange(value);
            }

            return (
              <button
                key={`${question.id}-${optionIndex}`}
                type="button"
                aria-pressed={selected}
                onClick={choose}
                className={
                  selected
                    ? 'flex w-full items-center gap-3 rounded-xl border-2 border-blue-600 bg-blue-100/90 px-4 py-3 text-left shadow-sm transition'
                    : 'flex w-full items-center gap-3 rounded-xl border border-blue-300 bg-white/80 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60'
                }
              >
                {showLabels ? (
                  <span
                    className={
                      selected
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white'
                        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-600 shadow-sm'
                    }
                  >
                    {optionLabel(
                      optionIndex,
                    )}
                  </span>
                ) : (
                  <ChoiceIndicator
                    selected={selected}
                    multiple={multiple}
                  />
                )}

                <span className="flex-1 text-sm font-medium leading-6 text-slate-800">
                  {value}
                </span>

                {showLabels &&
                selected ? (
                  <span className="text-lg font-semibold text-blue-600">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          },
        )}
      </div>
    );
  }

  if (question.type === 'scale') {
    return (
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-end justify-center gap-5 rounded-xl border border-blue-200 bg-white/70 px-4 py-5">
          <span className="max-w-32 text-xs text-slate-500">
            {question.scaleMinLabel}
          </span>

          {numberRange(
            question.scaleMin,
            question.scaleMax,
          ).map((value) => {
            const selected =
              answer === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange(value)
                }
                className="flex flex-col items-center gap-2"
              >
                <span className="text-sm font-medium text-slate-600">
                  {value}
                </span>

                <span
                  className={
                    selected
                      ? 'flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50'
                      : 'h-8 w-8 rounded-full border-2 border-blue-300 bg-white'
                  }
                >
                  {selected ? (
                    <span className="h-4 w-4 rounded-full bg-blue-600" />
                  ) : null}
                </span>
              </button>
            );
          })}

          <span className="max-w-32 text-xs text-slate-500">
            {question.scaleMaxLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-blue-300">
      <table className="min-w-full text-sm">
        <thead className="bg-blue-100/70">
          <tr>
            <th className="px-3 py-3" />

            {question.options.map(
              (
                column,
                columnIndex,
              ) => (
                <th
                  key={`${question.id}-column-${columnIndex}`}
                  className="px-3 py-3 text-center font-medium text-slate-600"
                >
                  {optionValue(
                    column,
                    columnIndex,
                  )}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {question.gridRows.map(
            (row, rowIndex) => {
              const rowLabel =
                row.trim() ||
                `Baris ${rowIndex + 1}`;

              return (
                <tr
                  key={`${question.id}-row-${rowIndex}`}
                  className="border-t border-slate-100"
                >
                  <td className="min-w-40 px-3 py-4 font-medium text-slate-700">
                    {rowLabel}
                  </td>

                  {question.options.map(
                    (
                      column,
                      columnIndex,
                    ) => {
                      const columnLabel =
                        optionValue(
                          column,
                          columnIndex,
                        );

                      const selected =
                        gridValue[
                          rowLabel
                        ] ===
                        columnLabel;

                      return (
                        <td
                          key={`${question.id}-${rowIndex}-${columnIndex}`}
                          className="px-3 py-4 text-center"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...gridValue,
                                [rowLabel]:
                                  columnLabel,
                              })
                            }
                            className={
                              selected
                                ? 'mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-blue-600 bg-blue-50'
                                : 'mx-auto h-7 w-7 rounded-full border-2 border-blue-300 bg-white'
                            }
                          >
                            {selected ? (
                              <span className="h-3.5 w-3.5 rounded-full bg-blue-600" />
                            ) : null}
                          </button>
                        </td>
                      );
                    },
                  )}
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </div>
  );
}
